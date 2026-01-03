import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import clsx from 'clsx';
import { Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const SignupPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    try {
      // Default role to student for now, or let backend handle default
      const res = await authApi.signup({ ...data, role: 'student' });
      // Auto login after signup
      login(res.data, res.data.accessToken, res.data.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background transition-colors duration-500">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-sky-200/40 dark:bg-sky-500/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-[10s]" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-200/40 dark:bg-purple-500/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-[8s]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[400px] relative z-10"
      >
        <div className="glass-card rounded-3xl p-8 border border-border shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-6 shadow-lg">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
              Create Account
            </h1>
            <p className="text-muted-foreground text-sm">
              Start managing your attendance today.
            </p>
          </div>

          {error && (
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 p-3 bg-destructive/10 text-destructive rounded-xl text-xs font-medium border border-destructive/20 text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Full Name</label>
              <input
                {...register('name')}
                type="text"
                className="input"
                placeholder="John Doe"
              />
              {errors.name && <p className="text-destructive text-[10px] ml-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Email</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-destructive text-[10px] ml-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Password</label>
              <input
                {...register('password')}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-destructive text-[10px] ml-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={clsx(
                "btn-primary w-full py-2.5 rounded-xl text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center shadow-lg mt-2",
                isLoading && "opacity-70 cursor-not-allowed hover:scale-100"
              )}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center">Create Account <ArrowRight className="w-4 h-4 ml-1.5 opacity-70" /></span>}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
             <p className="text-xs text-muted-foreground">
                Already have an account? <Link to="/login" className="text-foreground font-medium cursor-pointer hover:underline">Sign in</Link>
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
