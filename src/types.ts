export type Position = 
  | 'center' 
  | 'bottom-right-edge' 
  | 'bottom-left-edge' 
  | 'top-right-edge' 
  | 'top-left-edge' 
  | 'bottom-right-padded' 
  | 'bottom-left-padded' 
  | 'top-right-padded' 
  | 'top-left-padded';

export interface ProcessState {
  isProcessing: boolean;
  progress: number;
  total: number;
  current: number;
  message: string;
}
