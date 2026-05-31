import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Wifi, WifiOff, Settings, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PrinterStatus {
  isConnected: boolean;
  ip: string;
  port: number;
}

export function PrinterSettingsModal() {
  const [open, setOpen] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>({
    isConnected: false,
    ip: '192.168.1.100',
    port: 9100,
  });
  const [tempIP, setTempIP] = useState(printerStatus.ip);
  const [tempPort, setTempPort] = useState(printerStatus.port.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Load initial printer status
  useEffect(() => {
    const loadPrinterStatus = async () => {
      try {
        if (window.electronAPI) {
          const status = await window.electronAPI.getPrinterStatus();
          setPrinterStatus(status);
          setTempIP(status.ip);
          setTempPort(status.port.toString());
        }
      } catch (error) {
        console.error('Error loading printer status:', error);
      }
    };

    loadPrinterStatus();

    // Listen for printer status changes
    let unsubscribe: (() => void) | null = null;
    if (window.electronAPI) {
      unsubscribe = window.electronAPI.onPrinterStatusChange((status) => {
        setPrinterStatus(status);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSaveSettings = async () => {
    if (!tempIP.trim()) {
      toast.error('Please enter a valid printer IP address');
      return;
    }

    const port = parseInt(tempPort);
    if (isNaN(port) || port < 1 || port > 65535) {
      toast.error('Please enter a valid port number (1-65535)');
      return;
    }

    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.setPrinterAddress(tempIP, port);
        if (result.success) {
          toast.success('Printer settings updated');
          setOpen(false);
        } else {
          toast.error(result.message || 'Failed to update settings');
        }
      }
    } catch (error) {
      toast.error('Error updating printer settings');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.testPrinterConnection();
        if (result.success) {
          toast.success('Printer connection test successful!');
        } else {
          toast.error(`Connection failed: ${result.message}`);
        }
      }
    } catch (error) {
      toast.error('Error testing connection');
      console.error(error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          title="Configure thermal printer"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Printer Settings</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Thermal Printer Settings
          </DialogTitle>
          <DialogDescription>
            Configure WiFi/LAN thermal printer connection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-2">
              {printerStatus.isConnected ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-600">Disconnected</span>
                </>
              )}
            </div>
            <span className="text-xs text-gray-600">
              {printerStatus.ip}:{printerStatus.port}
            </span>
          </div>

          {/* IP Address */}
          <div className="space-y-2">
            <Label htmlFor="printer-ip" className="text-sm font-medium">
              Printer IP Address
            </Label>
            <Input
              id="printer-ip"
              placeholder="192.168.1.100"
              value={tempIP}
              onChange={(e) => setTempIP(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-gray-600">Enter your printer's IP address on the network</p>
          </div>

          {/* Port */}
          <div className="space-y-2">
            <Label htmlFor="printer-port" className="text-sm font-medium">
              Port Number
            </Label>
            <Input
              id="printer-port"
              type="number"
              placeholder="9100"
              value={tempPort}
              onChange={(e) => setTempPort(e.target.value)}
              min="1"
              max="65535"
              className="font-mono"
            />
            <p className="text-xs text-gray-600">Default: 9100 (ESC/POS protocol)</p>
          </div>

          {/* Info Box */}
          <div className="flex gap-2 rounded-lg bg-blue-50 p-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-700">
              Make sure your thermal printer is connected to the same network and is powered on.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || isLoading || !tempIP.trim()}
              className="flex-1"
            >
              {isTesting ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                  Testing...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>

            <Button
              onClick={handleSaveSettings}
              disabled={isLoading || isTesting}
              className="flex-1"
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
