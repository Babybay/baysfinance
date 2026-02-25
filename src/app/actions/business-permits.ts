// This file is kept for backward compatibility.
// All permit actions are now in permits.ts

export {
    getPermits,
    getPermitById,
    verifyDocument,
    updatePermitDocument,
    updateChecklistItem,
    updatePermitStatus,
    getPermitTypes,
    getPermitTypeBySlug,
    createPermitCase,
} from "./permits";
