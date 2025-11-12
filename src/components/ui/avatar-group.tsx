'use client';

import * as React from 'react';
import { motion, type Transition } from 'framer-motion';
import { Children } from 'react';
import { cn } from '@/lib/utils';
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

type TooltipContentProps = React.ComponentProps<typeof TooltipContent>;

type AvatarMotionProps = {
  children: React.ReactNode;
  zIndex: number;
  translate: string | number;
  transition: Transition;
  tooltipContent?: React.ReactNode;
  tooltipProps?: Partial<TooltipContentProps>;
};

function AvatarMotionContainer({
  children,
  zIndex,
  translate,
  transition,
  tooltipContent,
  tooltipProps,
}: AvatarMotionProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipTrigger asChild>
        <motion.div
          data-slot="avatar-container"
          className="relative"
          style={{ zIndex }}
          whileHover={{
            y: translate,
          }}
          transition={transition}
        >
          {children}
        </motion.div>
      </TooltipTrigger>
      {tooltipContent && (
        <AvatarGroupTooltip {...tooltipProps}>
          {tooltipContent}
        </AvatarGroupTooltip>
      )}
    </TooltipPrimitive.Root>
  );
}

type AvatarCSSProps = {
  children: React.ReactNode;
  zIndex: number;
  tooltipContent?: React.ReactNode;
  tooltipProps?: Partial<TooltipContentProps>;
};

function AvatarCSSContainer({
  children,
  zIndex,
  tooltipContent,
  tooltipProps,
}: AvatarCSSProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipTrigger asChild>
        <div
          data-slot="avatar-container"
          className="relative transition-transform duration-300 ease-out hover:-translate-y-2"
          style={{ zIndex }}
        >
          {children}
        </div>
      </TooltipTrigger>
      {tooltipContent && (
        <AvatarGroupTooltip {...tooltipProps}>
          {tooltipContent}
        </AvatarGroupTooltip>
      )}
    </TooltipPrimitive.Root>
  );
}

type AvatarStackItemProps = {
  children: React.ReactNode;
  index: number;
  size: number;
  className?: string;
};

function AvatarStackItem({ children, index, size, className }: AvatarStackItemProps) {
  return (
    <div
      className={cn(
        'size-full shrink-0 overflow-hidden rounded-full',
        '[&_[data-slot="avatar"]]:size-full',
        className
      )}
      style={{
        width: size,
        height: size,
        maskImage: index
          ? `radial-gradient(circle ${size / 2}px at -${size / 4 + size / 10}px 50%, transparent 99%, white 100%)`
          : '',
      }}
    >
      {children}
    </div>
  );
}

type AvatarGroupTooltipProps = TooltipContentProps;

function AvatarGroupTooltip(props: AvatarGroupTooltipProps) {
  return <TooltipContent {...props} />;
}
AvatarGroupTooltip.displayName = 'AvatarGroupTooltip';

type AvatarGroupVariant = 'motion' | 'css' | 'stack';

type AvatarGroupProps = Omit<React.ComponentProps<'div'>, 'translate'> & {
  children: React.ReactElement[];
  variant?: AvatarGroupVariant;
  transition?: Transition;
  invertOverlap?: boolean;
  translate?: string | number;
  tooltipProps?: Partial<TooltipContentProps>;
  animate?: boolean;
  size?: number;
};

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(({
  children,
  className,
  variant = 'motion',
  transition = { type: 'spring', stiffness: 300, damping: 17 },
  invertOverlap = false,
  translate = '-30%',
  tooltipProps = { side: 'top', sideOffset: 24 },
  animate = false,
  size = 40,
  ...props
}, ref) => {
  if (variant === 'stack') {
    return (
      <div
        ref={ref}
        className={cn(
          '-space-x-1 flex items-center',
          animate && 'hover:space-x-0 [&>*]:transition-all',
          className
        )}
        {...props}
      >
        {Children.map(children, (child, index) => {
          if (!child) {
            return null;
          }
          return (
            <AvatarStackItem
              key={index}
              index={index}
              size={size}
              className={className}
            >
              {child}
            </AvatarStackItem>
          );
        })}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div
        ref={ref}
        data-slot="avatar-group"
        className={cn(
          'flex items-center',
          variant === 'css' && '-space-x-3',
          variant === 'motion' && 'flex-row -space-x-2 h-8',
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return null;
          
          const zIndex = invertOverlap ? React.Children.count(children) - index : index;
          
          // Chercher AvatarGroupTooltip dans les enfants
          const childProps = child.props as { children?: React.ReactNode };
          const tooltipChild = React.Children.toArray(childProps.children || []).find(
            (c) => {
              if (!React.isValidElement(c)) return false;
              // Comparer le type du composant (gère les cas où React optimise)
              return c.type === AvatarGroupTooltip || 
                     (typeof c.type === 'function' && c.type.name === 'AvatarGroupTooltip') ||
                     (c.type && (c.type as any).displayName === 'AvatarGroupTooltip');
            }
          );
          const tooltipContent = tooltipChild && React.isValidElement(tooltipChild) 
            ? (tooltipChild.props as { children?: React.ReactNode }).children 
            : undefined;

          if (variant === 'motion') {
            return (
              <AvatarMotionContainer
                key={child.key || index}
                zIndex={zIndex}
                translate={translate}
                transition={transition}
                tooltipContent={tooltipContent}
                tooltipProps={tooltipProps}
              >
                {React.cloneElement(child, { children: React.Children.toArray(childProps.children || []).filter(
                  (c) => {
                    if (!React.isValidElement(c)) return true;
                    return c.type !== AvatarGroupTooltip && 
                           !(typeof c.type === 'function' && c.type.name === 'AvatarGroupTooltip') &&
                           !(c.type && (c.type as any).displayName === 'AvatarGroupTooltip');
                  }
                )} as any)}
              </AvatarMotionContainer>
            );
          }

          return (
            <AvatarCSSContainer
              key={child.key || index}
              zIndex={zIndex}
              tooltipContent={tooltipContent}
              tooltipProps={tooltipProps}
            >
              {React.cloneElement(child, { children: React.Children.toArray(childProps.children || []).filter(
                (c) => {
                  if (!React.isValidElement(c)) return true;
                  return c.type !== AvatarGroupTooltip && 
                         !(typeof c.type === 'function' && c.type.name === 'AvatarGroupTooltip') &&
                         !(c.type && (c.type as any).displayName === 'AvatarGroupTooltip');
                }
              )} as any)}
            </AvatarCSSContainer>
          );
        })}
      </div>
    </TooltipProvider>
  );
});

AvatarGroup.displayName = 'AvatarGroup';

export {
  AvatarGroup,
  AvatarGroupTooltip,
  type AvatarGroupProps,
  type AvatarGroupTooltipProps,
  type AvatarGroupVariant,
};

