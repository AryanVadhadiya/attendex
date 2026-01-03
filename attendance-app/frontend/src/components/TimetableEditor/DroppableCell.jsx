import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import { X } from 'lucide-react';

const DroppableCell = ({ day, hour, slot, onRemove }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${day}-${hour}`,
    data: { day, hour, origin: 'grid' }
  });

  if (slot) {
     const isLab = slot.sessionType === 'lab';

     return (
       <div
         ref={setNodeRef}
         className={clsx(
           "relative border-b border-r border-border/60 p-1 transition-colors",
           isLab ? "h-[calc(128px+1px)]" : "h-16",
           "overflow-hidden"
         )}
       >
          <div className={clsx(
             "w-full rounded-lg px-2 py-1 text-xs group flex flex-col justify-center transition-all overflow-hidden h-full relative shadow-sm"
         )}
         style={{
           backgroundColor: slot.subject.color + '20',
           boxShadow: `inset 3px 0 0 ${slot.subject.color}`
         }}
         >
             <div className="flex flex-col gap-0.5 min-w-0">
                <p className="font-bold text-foreground text-xs mb-0.5 truncate">
                    {slot.subject.code || slot.subject.name}
                </p>
                {slot.subject.code && slot.subject.name !== slot.subject.code && (
                    <p className="text-[9px] text-muted-foreground leading-none mb-1 truncate">{slot.subject.name}</p>
                )}
                <span className={clsx(
                    "self-start px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider",
                    isLab ? "bg-foreground/10 text-foreground" : "text-muted-foreground p-0"
                )}>
                    {slot.sessionType === 'lab' ? 'LAB' : 'LEC'}
                </span>
             </div>

             <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(slot);
                }}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
             >
                 <X className="w-3 h-3" />
             </button>
         </div>
       </div>
     );
  }

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "border-b border-r border-border/60 transition-colors h-16 flex items-center justify-center",
        isOver ? "bg-accent/10" : "bg-card/30"
      )}
    >
        {/* Empty */}
    </div>
  );
};

export default DroppableCell;
