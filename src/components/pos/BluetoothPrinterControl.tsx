import { Bluetooth, BluetoothOff, Loader2, Printer, WifiOff } from "lucide-react";
import { usePrinter } from "../../context/PrinterContext";
import { motion, AnimatePresence } from "framer-motion";

export function BluetoothPrinterControl() {
  const { status, connect, disconnect, deviceName, error } = usePrinter();

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-emerald-500 bg-emerald-500/10';
      case 'connecting': return 'text-amber-500 bg-amber-500/10';
      case 'error': return 'text-rose-500 bg-rose-500/10';
      case 'disconnected': return 'text-slate-400 bg-slate-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'connected': return 'Printer Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Failed';
      case 'disconnected': return 'Printer Disconnected';
      default: return 'Connect Printer';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={status === 'connected' ? disconnect : connect}
        disabled={status === 'connecting'}
        className={`group relative flex h-12 items-center gap-3 overflow-hidden rounded-xl border px-4 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 ${
          status === 'connected'
            ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10'
            : 'border-border bg-surface hover:border-primary/30 hover:bg-surface-alt'
        }`}
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${getStatusColor()}`}>
          {status === 'connecting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === 'connected' ? (
            <Bluetooth className="h-4 w-4" />
          ) : status === 'error' ? (
            <BluetoothOff className="h-4 w-4" />
          ) : (
            <Printer className="h-4 w-4" />
          )}
        </div>

        <div className="flex flex-col items-start overflow-hidden text-left">
          <span className={`text-xs font-bold uppercase tracking-wider ${status === 'connected' ? 'text-emerald-600' : 'text-text-secondary'}`}>
            {getStatusLabel()}
          </span>
          <span className="max-w-[140px] truncate text-[10px] font-medium text-text-secondary/70">
            {status === 'connected' ? deviceName : 'Bluetooth Thermal Printer'}
          </span>
        </div>

        {status === 'connected' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
          />
        )}
      </button>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="px-1 text-[10px] font-medium text-rose-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
