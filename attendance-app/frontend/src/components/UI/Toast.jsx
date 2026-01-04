import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useEffect } from 'react';

const toastVariants = {
    initial: { opacity: 0, y: -20, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};

const icons = {
    success: <Check className="w-5 h-5 text-emerald-500" strokeWidth={3} />,
    error: <XCircle className="w-5 h-5 text-red-500" strokeWidth={2.5} />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" strokeWidth={2.5} />,
    info: <Info className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
};

const bgColors = {
    success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50',
    error: 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50',
    info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50'
};

const Toast = ({ id, message, type = 'info', duration = 3000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    return (
        <motion.div
            layout
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`
                pointer-events-auto
                relative w-full max-w-sm rounded-xl border p-4 shadow-lg backdrop-blur-md
                flex items-start gap-3
                ${bgColors[type]}
            `}
        >
            <div className="shrink-0 mt-0.5">
                {icons[type]}
            </div>
            <div className="flex-1 pt-0.5">
                <p className="text-sm font-medium text-foreground leading-tight">
                    {message}
                </p>
            </div>
            <button
                onClick={() => onClose(id)}
                className="shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors -mr-1 -mt-1 text-muted-foreground"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
};

export default Toast;
