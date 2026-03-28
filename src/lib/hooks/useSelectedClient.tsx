"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRoles } from "./useRoles";

export interface ClientOption {
    id: string;
    nama: string;
}

interface SelectedClientContextType {
    /** Currently selected clientId (empty string = none selected) */
    selectedClientId: string;
    setSelectedClientId: (id: string) => void;
    /** Client list loaded at layout level */
    clients: ClientOption[];
    /** True while the client list is loading */
    loading: boolean;
}

const SelectedClientContext = createContext<SelectedClientContextType>({
    selectedClientId: "",
    setSelectedClientId: () => {},
    clients: [],
    loading: true,
});

export function SelectedClientProvider({
    children,
    clients: initialClients,
}: {
    children: React.ReactNode;
    clients: ClientOption[];
}) {
    const { isClient, clientId: ownClientId } = useRoles();
    const [selectedClientId, setSelectedClientId] = useState("");
    const [clients] = useState(initialClients);

    // Auto-scope client-role users to their own clientId
    useEffect(() => {
        if (isClient && ownClientId) {
            setSelectedClientId(ownClientId);
        }
    }, [isClient, ownClientId]);

    return (
        <SelectedClientContext.Provider
            value={{
                selectedClientId,
                setSelectedClientId,
                clients,
                loading: false,
            }}
        >
            {children}
        </SelectedClientContext.Provider>
    );
}

export function useSelectedClient() {
    return useContext(SelectedClientContext);
}
