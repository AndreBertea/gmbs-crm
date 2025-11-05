import { supabase } from "@/lib/supabase-client";
import type { InterventionReminder } from "./common/types";

type ReminderRow = InterventionReminder & {
  mentioned_user_ids: string[] | null;
};

const USER_FIELDS = "id, firstname, lastname, email";
const REMINDER_SELECT = `*, user:users!intervention_reminders_user_id_fkey(${USER_FIELDS})`;

async function enrichMentionedUsers(reminders: ReminderRow[]): Promise<InterventionReminder[]> {
  const mentionedIds = new Set<string>();
  reminders.forEach((reminder) => {
    (reminder.mentioned_user_ids ?? []).forEach((id) => mentionedIds.add(id));
  });

  if (mentionedIds.size === 0) {
    return reminders.map((reminder) => ({
      ...reminder,
      mentioned_user_ids: reminder.mentioned_user_ids ?? [],
      mentioned_users: [],
    }));
  }

  const { data: users, error } = await supabase
    .from("users")
    .select(USER_FIELDS)
    .in("id", Array.from(mentionedIds));

  if (error) throw error;

  const usersById = new Map(users?.map((user) => [user.id, user]));

  return reminders.map((reminder) => {
    const ids = reminder.mentioned_user_ids ?? [];
    return {
      ...reminder,
      mentioned_user_ids: ids,
      mentioned_users: ids
        .map((id) => usersById.get(id))
        .filter(Boolean) as InterventionReminder["mentioned_users"],
    };
  });
}

function ensureReminderParams(params: {
  note?: string | null;
  due_date?: string | null;
}): void {
  const hasNote = Boolean(params.note && params.note.trim().length > 0);
  const hasDueDate = Boolean(params.due_date);
  if (!hasNote && !hasDueDate) {
    throw new Error("Une note ou une date d'échéance est requise.");
  }
}

export const remindersApi = {
  async getMyReminders(): Promise<InterventionReminder[]> {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      throw new Error("Not authenticated");
    }

    const { data, error } = await supabase
      .from("intervention_reminders")
      .select(REMINDER_SELECT)
      .or(`user_id.eq.${user.id},mentioned_user_ids.cs.{${user.id}}`)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return enrichMentionedUsers(data as ReminderRow[]);
  },

  async upsertReminder(params: {
    intervention_id: string;
    note?: string | null;
    due_date?: string | null;
    mentioned_user_ids?: string[];
  }): Promise<InterventionReminder> {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      throw new Error("Not authenticated");
    }

    ensureReminderParams(params);

    const { data: existing } = await supabase
      .from("intervention_reminders")
      .select("id")
      .eq("intervention_id", params.intervention_id)
      .eq("user_id", user.id)
      .single();

    const payload = {
      note: params.note ?? null,
      due_date: params.due_date ?? null,
      mentioned_user_ids: params.mentioned_user_ids ?? [],
    };

    if (existing) {
      const { data, error } = await supabase
        .from("intervention_reminders")
        .update(payload)
        .eq("id", existing.id)
        .select(REMINDER_SELECT)
        .single();

      if (error) throw error;
      return (await enrichMentionedUsers([data as ReminderRow]))[0]!;
    }

    const { data, error } = await supabase
      .from("intervention_reminders")
      .insert({
        intervention_id: params.intervention_id,
        user_id: user.id,
        ...payload,
      })
      .select(REMINDER_SELECT)
      .single();

    if (error) throw error;
    return (await enrichMentionedUsers([data as ReminderRow]))[0]!;
  },

  async deleteReminder(id: string): Promise<void> {
    const { error } = await supabase
      .from("intervention_reminders")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async getReminderByIntervention(intervention_id: string): Promise<InterventionReminder | null> {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      throw new Error("Not authenticated");
    }

    const { data, error } = await supabase
      .from("intervention_reminders")
      .select(REMINDER_SELECT)
      .eq("intervention_id", intervention_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    if (!data) return null;

    return (await enrichMentionedUsers([data as ReminderRow]))[0] ?? null;
  },
};
