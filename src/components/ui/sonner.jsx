import React from 'react';
import { Toaster as Sonner, toast } from 'sonner';

export function Toaster({ ...props }) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[#09090b]/95 group-[.toaster]:text-slate-100 group-[.toaster]:border-white/10 group-[.toaster]:backdrop-blur-xl group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl',
          description: 'group-[.toast]:text-slate-400',
          actionButton:
            'group-[.toast]:bg-blue-600 group-[.toast]:text-white group-[.toast]:font-semibold',
          cancelButton:
            'group-[.toast]:bg-white/10 group-[.toast]:text-slate-300',
        },
      }}
      {...props}
    />
  );
}

export { toast };
export default Toaster;
