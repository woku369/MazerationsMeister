
// import type { Timestamp } from 'firebase/firestore'; // No longer needed
import type { MazerationFormData } from '@/schemas/mazerationSchema';

// MazerationFormData (imported from mazerationSchema) is now the primary type
// for form data and data passed to export functions.

// Types related to Firestore structure are no longer needed:
// export type ProtocolDataForFirestore = Omit<MazerationFormData, 'id' | 'creationDate' | 'harvestDate' | 'macerationStart' | 'macerationEnd' | 'createdAt'>;
// export type MazerationProtocolDocument = ProtocolDataForFirestore & {
//   creationDate: Timestamp;
//   harvestDate: Timestamp | null;
//   macerationStart: Timestamp;
//   macerationEnd: Timestamp;
//   createdAt?: Timestamp; // For server-side timestamping
// };

// Type for data after fetching from Firestore is no longer needed:
// export type MazerationProtocol = Omit<MazerationFormData, 'createdAt'> & {
//   id: string;
//   createdAt?: Date; // Converted from Timestamp
// };

// Ensure MazerationFormData is re-exported if it's the main type used externally from this file
// export type { MazerationFormData }; // Already available from schema import
