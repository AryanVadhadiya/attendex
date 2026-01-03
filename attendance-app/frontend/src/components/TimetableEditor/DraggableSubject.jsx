import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';

const DraggableSubject = ({ subject, sessionType, remaining }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `palette-${subject._id}-${sessionType}`,
    data: {
      subject,
      sessionType, // 'lecture' or 'lab'
      duration: sessionType === 'lab' ? 2 : 1,
      origin: 'palette'
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx(
        "cursor-grab active:cursor-grabbing p-3 rounded-lg border shadow-sm bg-card mb-3 hover:shadow-md transition-shadow select-none relative group",
        "border-border",
        sessionType === 'lab' ? "h-24 border-double" : "h-12"
      )}
    >
      <div className="flex items-center">
        <div
          className="w-3 h-3 rounded-full mr-3 shrink-0"
          style={{ backgroundColor: subject.color }}
        />
        <div>
           <p className="font-medium text-sm text-foreground truncate max-w-[120px]">{subject.name}</p>
           <p className="text-xs text-muted-foreground uppercase">{sessionType}</p>
        </div>
      </div>

      {remaining !== undefined && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded-full border border-border">
              x{remaining}
          </div>
      )}
    </div>
  );
};

export default DraggableSubject;
