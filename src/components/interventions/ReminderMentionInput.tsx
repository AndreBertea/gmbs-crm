"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useUsers, type MentionableUser } from "@/hooks/useUsers";

interface Props {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  placeholder?: string;
}

const mentionRegex = /@([\w.-]+)/g;

export function ReminderMentionInput({ value, onChange, placeholder }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionableUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const { users, loading } = useUsers();

  useEffect(() => {
    if (!showSuggestions || suggestions.length > 0 || loading) return;
    setShowSuggestions(false);
  }, [showSuggestions, suggestions.length, loading]);

  const usersByHandle = useMemo(() => {
    return new Map(users.map((user) => [user.handle.toLowerCase(), user]));
  }, [users]);

  const resolveMentionIds = (content: string): string[] => {
    const matches = [...content.matchAll(mentionRegex)];
    if (matches.length === 0) return [];
    return matches
      .map((match) => {
        const identifier = match[1]?.toLowerCase();
        if (!identifier) return null;
        
        // Essayer de trouver l'utilisateur par handle exact
        let user = usersByHandle.get(identifier);
        if (user) return user.id;
        
        // Si pas trouvé, essayer de trouver par recherche dans le texte de recherche
        user = users.find(u => u.searchText.includes(identifier));
        if (user) return user.id;
        
        return null;
      })
      .filter((id): id is string => Boolean(id));
  };

  const updateValue = (content: string) => {
    const mentionedIds = resolveMentionIds(content);
    onChange(content, mentionedIds);
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    const cursor = event.target.selectionStart ?? newValue.length;
    const textBeforeCursor = newValue.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf("@");

    if (lastAt >= 0) {
      const query = textBeforeCursor.slice(lastAt + 1);
      const hasSpace = /\s/.test(query);
      if (!hasSpace) {
        const normalizedQuery = query.toLowerCase();
        const filtered =
          normalizedQuery.length === 0
            ? users.slice(0, 20)
            : users
                .filter((user) => user.searchText.includes(normalizedQuery) || user.handle.includes(normalizedQuery))
                .slice(0, 20);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setMentionStart(lastAt);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }

    updateValue(newValue);
  };

  const insertMention = (user: MentionableUser) => {
    if (mentionStart === null || !textareaRef.current) return;

    const username = user.handle.toLowerCase();
    const currentValue = textareaRef.current.value;
    const before = currentValue.slice(0, mentionStart);
    const cursor = textareaRef.current.selectionStart ?? currentValue.length;
    const after = currentValue.slice(cursor);
    const updated = `${before}@${username} ${after}`;

    setShowSuggestions(false);
    setMentionStart(null);
    updateValue(updated);

    requestAnimationFrame(() => {
      const newCursor = mentionStart + username.length + 2;
      textareaRef.current?.setSelectionRange(newCursor, newCursor);
      textareaRef.current?.focus();
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      insertMention(suggestions[selectedIndex]);
    } else if (event.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-[100px]"
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-[80] mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                insertMention(user);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm rounded-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                "outline-none cursor-pointer",
                index === selectedIndex && "bg-accent text-accent-foreground",
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">{user.displayName}</span>
                <span className="text-xs text-muted-foreground">@{user.handle}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
