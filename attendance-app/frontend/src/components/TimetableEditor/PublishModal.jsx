import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, AlertTriangle, XCircle, AlertCircle } from 'lucide-react';

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
};

const modalVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
    exit: { opacity: 0, scale: 0.9, y: -20 }
};

const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
};

export default function PublishModal({ isOpen, step, message, onConfirm, onCancel, onClose }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                >
                    <motion.div
                        className="w-full max-w-md bg-white/90 dark:bg-card/90 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-2xl p-6 overflow-hidden relative"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <AnimatePresence mode="wait">
                            {/* PUBLISHING STATE */}
                            {step === 'publishing' && (
                                <motion.div
                                    key="publishing"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col items-center text-center py-4"
                                >
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse"></div>
                                        <Loader2 className="w-12 h-12 text-accent animate-spin relative z-10" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground">Publishing Timetable</h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Validating slots and generating occurrences...
                                    </p>
                                </motion.div>
                            )}

                            {/* LOCKING STATE */}
                            {step === 'locking' && (
                                <motion.div
                                    key="locking"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col items-center text-center py-4"
                                >
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse"></div>
                                        <Loader2 className="w-12 h-12 text-accent animate-spin relative z-10" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground">Locking Configuration</h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Securing your timetable settings...
                                    </p>
                                </motion.div>
                            )}

                            {/* UNLOCKING STATE */}
                            {step === 'unlocking' && (
                                <motion.div
                                    key="unlocking"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col items-center text-center py-4"
                                >
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse"></div>
                                        <Loader2 className="w-12 h-12 text-accent animate-spin relative z-10" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground">Unlocking Configuration</h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Enabling editing mode...
                                    </p>
                                </motion.div>
                            )}

                            {/* CONFIRM AUTO MARK */}
                            {step === 'confirm_auto_mark' && (
                                <motion.div
                                    key="confirm_auto_mark"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col items-center text-center py-2"
                                >
                                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">Past Start Date</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-[90%]">
                                        {message || "The start date is in the past. Do you want to auto-mark attendance for past dates based on this timetable?"}
                                    </p>
                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={onCancel}
                                            className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-transparent hover:bg-muted text-sm font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={onConfirm}
                                            className="flex-1 py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground text-sm font-medium transition-colors shadow-lg shadow-accent/20"
                                        >
                                            Confirm & Auto-Mark
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                             {/* CONFIRM FORCE RESET */}
                             {step === 'confirm_force_reset' && (
                                <motion.div
                                    key="confirm_force_reset"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col items-center text-center py-2"
                                >
                                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-destructive">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">Conflict Detected</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-[90%]">
                                        {message || "Existing attendance data conflicts with this new timetable. Do you want to force a reset? This will clear partial data."}
                                    </p>
                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={onCancel}
                                            className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-transparent hover:bg-muted text-sm font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={onConfirm}
                                            className="flex-1 py-2.5 px-4 rounded-xl bg-destructive hover:bg-red-600 text-white text-sm font-medium transition-colors shadow-lg shadow-destructive/20"
                                        >
                                            Force Reset
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* CONFIRM RESET PRIMARY */}
                            {step === 'confirm_reset_primary' && (
                                <motion.div
                                    key="confirm_reset_primary"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col items-center text-center py-4"
                                >
                                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">Reset Timetable?</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-[90%]">
                                        {message || 'Resetting unlocks the semester start date but will wipe all attendance data once you publish again.'}
                                    </p>
                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={onCancel}
                                            className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-transparent hover:bg-muted text-sm font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={onConfirm}
                                            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors shadow-lg shadow-amber-500/30"
                                        >
                                            Continue
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* CONFIRM RESET SECONDARY */}
                            {step === 'confirm_reset_secondary' && (
                                <motion.div
                                    key="confirm_reset_secondary"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col items-center text-center py-4"
                                >
                                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-destructive">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">Final Confirmation</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-[90%]">
                                        This action cannot be undone. Publishing after this reset will delete every attendance record tied to the current timetable.
                                    </p>
                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={onCancel}
                                            className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-transparent hover:bg-muted text-sm font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={onConfirm}
                                            className="flex-1 py-2.5 px-4 rounded-xl bg-destructive hover:bg-red-600 text-white text-sm font-medium transition-colors shadow-lg shadow-destructive/20"
                                        >
                                            Yes, Reset
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* SUCCESS STATE */}
                            {(step === 'success' || step === 'lock_success' || step === 'unlock_success') && (
                                <motion.div
                                    key="success"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col items-center text-center py-4"
                                >
                                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                                        <motion.div
                                            initial={{ scale: 0, rotate: -45 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.1 }}
                                        >
                                            <Check className="w-8 h-8 text-accent" strokeWidth={3} />
                                        </motion.div>
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">
                                        {step === 'lock_success' ? 'Locked Successfully!' :
                                         step === 'unlock_success' ? 'Unlocked Successfully!' :
                                         'All Done!'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {step === 'lock_success' ? 'Configuration is now read-only.' :
                                         step === 'unlock_success' ? 'Configuration is now editable.' :
                                         (message || 'Timetable published and occurrences generated.')}
                                    </p>
                                </motion.div>
                            )}

                            {/* RESET READY STATE */}
                            {step === 'reset_ready' && (
                                <motion.div
                                    key="reset_ready"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col items-center text-center py-4"
                                >
                                    <div className="w-16 h-16 bg-amber-200/40 rounded-full flex items-center justify-center mb-4">
                                        <Check className="w-8 h-8 text-amber-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">Reset Armed</h3>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {message || 'Start date unlocked. Update it and publish to rebuild from scratch.'}
                                    </p>
                                </motion.div>
                            )}

                             {/* ERROR STATE */}
                             {step === 'error' && (
                                <motion.div
                                    key="error"
                                    variants={stepVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="flex flex-col items-center text-center py-4"
                                >
                                    <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                                        <XCircle className="w-8 h-8 text-destructive" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-destructive mb-2">
                                        {(step === 'error' && (message?.toLowerCase().includes('lock') || message?.toLowerCase().includes('unlock'))) ? 'Action Failed' : 'Publishing Failed'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        {message || "An unexpected error occurred."}
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="py-2 px-6 rounded-xl border border-border bg-transparent hover:bg-muted text-sm font-medium transition-colors"
                                    >
                                        Close
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
