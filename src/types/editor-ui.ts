// ─────────────────────────────────────────────────────────────────────────────
// Editor UI State Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The currently active tool in the Left ToolBar.
 * Determines what happens when the user interacts with the canvas
 * and which panel section to highlight.
 */
export type EditorTool =
  | 'select'      // Default pointer / selection
  | 'image'       // Add image layer
  | 'text'        // Add text layer
  | 'shape'       // Add shape layer
  | 'collage'     // Collage layout tool
  | 'background'; // Canvas background settings

/**
 * Which panel is active in the right sidebar.
 */
export type SidebarPanel =
  | 'properties'  // Context-sensitive object properties
  | 'layers'      // Layer list
  | 'export';     // Export & project settings

/**
 * Which panel is open in the mobile bottom sheet.
 * null means the sheet is closed.
 */
export type BottomSheetPanel =
  | 'properties'
  | 'layers'
  | 'export'
  | null;
