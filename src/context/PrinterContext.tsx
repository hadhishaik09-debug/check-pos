import React, { createContext, useContext } from "react";

const PrinterContext = createContext<any>(null);

export const PrinterProvider = ({ children }: any) => {
  return (
    <PrinterContext.Provider
      value={{
        status: "disconnected",
        connect: async () => {},
        disconnect: () => {},
        printData: async () => {},
        deviceName: "",
        error: "",
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
};

export const usePrinter = () => useContext(PrinterContext);
