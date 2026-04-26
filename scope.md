# Takeoff - Project Scope

## 1. Project Overview

**Project Name:** Takeoff 
**Type:** Web Application (Next.js)  
**Core Functionality:** PDF-based architectural drawing viewer with measurement and annotation tools for construction takeoff calculations  
**Target Users:** Construction professionals, estimators, architects

---

## 2. Feature Requirements

### 2.1 Document Upload (Home Page)

- **Upload Interface:** Drag-and-drop or file picker for PDF files
- **Multi-page Support:** Handle PDFs with one or more pages
- **Storage:** Upload PDF to Supabase Storage bucket
- **Database:** Create project record in PostgreSQL with:
  - UUID (primary key)
  - PDF URL (Supabase Storage link)
  - Created timestamp
  - User ID (for future auth)
- **Redirect:** After upload, navigate to `/d/[document_uuid]`

### 2.2 Document Overview Route (`/d/[document_uuid]`)

- **On Mount:** Fetch PDF from Supabase Storage
- **Page Layout:** Display all pages in a grid or list layout
- **Navigation:** Click on any page to navigate to `/d/[document_uuid]/p/[page_num]`

### 2.3 Page Viewer Route (`/d/[document_uuid]/p/[page_num]`)

- **PDF Rendering:** Display single page in full-screen view
- **Pan & Zoom:** Enable panning and zooming of the PDF page
- **Scale Setting Tool:**
  - Click "Set Scale" button to activate
  - Click two points on canvas to draw a reference line
  - Popup modal to input real-world dimension in units selected from dropdown (only meters should be selectable for MVP)
  - Calculate and store pixels-per-unit ratio

### 2.4 Drawing Tools

Three geometric element types:

1. **Point Object (Count)**
   - Click to place on canvas
   - Tracks `count` parameter (default: 1)
   - Visual: Dot/marker

2. **Polyline Object (Length)**
   - Click to place multiple vertices
   - Double-click to complete
   - Tracks `length` parameter (in real-world units)
   - Visual: Connected line segments

3. **Closed Polyline (Area)**
   - Click to place multiple vertices
   - Click on first point to close
   - Tracks `area` parameter (in real-world units)
   - Visual: Filled polygon

### 2.5 Elements Table Panel

- **Dockable:** Right-side panel (default), expandable to full-screen
- **Grouping:** Elements grouped by type (Point, Polyline, Closed Polyline)
- **Reordering:** Drag handle on left of each item to reorder within type groups
- **Display:** Show element type, tracked value, and identifier
- **Selection:** Click on row to select element (highlights in canvas)
- **Deletion:** Context button to delete any element
- **Persistence:** Auto-save to PostgreSQL on any add/delete operation

### 2.6 Element Selection & Editing

- **Canvas Selection:** Click on any element in the canvas to select it
- **Table Selection:** Click on any row in the elements table to select it
- **Bidirectional Selection:** Selecting an element in the canvas highlights it in the table, and vice versa
- **Single Selection:** Clicking a new element deselects the previous one
- **Multi-Selection:** Hold Shift while clicking to select multiple elements
- **Keyboard Deletion:** Press Delete key to remove all selected elements
- **Element Editing:** 
  - Click and drag any point of a polyline to reposition it
  - Updates to points recalculate the tracked value (length/area) in real-time

---

## 3. Technical Proposal

### 3.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| UI Library | React 18+ |
| Styling | Tailwind CSS |
| PDF Rendering | react-pdf or pdfjs-dist |
| Canvas/Drawing | Konva.js (react-konva) or Fabric.js |
| State Management | Zustand |
| Backend | Supabase (PostgreSQL + Storage) |
| Database ORM | Supabase JS SDK + Drizzle ORM (optional) |
| Drag & Drop | @dnd-kit/core |

### 3.2 Database Schema

```sql
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Pages table (for scale per page)
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  scale_factor FLOAT, -- pixels per unit
  scale_unit TEXT, -- e.g., 'feet', 'meters'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Elements table
CREATE TABLE elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'point', 'polyline', 'closed_polyline'
  points JSONB NOT NULL, -- array of {x, y} coordinates
  value FLOAT NOT NULL, -- calculated: count, length, or area
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.3 Supabase Storage

- **Bucket Name:** `pdfs`
- **Access Policy:** Public read access for authenticated users

### 3.4 Key Implementation Decisions

1. **PDF Rendering:** Use `react-pdf` for rendering, `react-konva` for canvas overlay
2. **Scale Calculation:** Store scale as pixels-per-unit; apply to all measurements
3. **Real-time Save:** Debounced auto-save on element changes (500ms delay)
4. **Drag Reorder:** Use @dnd-kit for table row reordering within groups

---

## 4. Project Structure

```
takeoff/
├── app/
│   ├── page.tsx                    # Home - upload page
│   ├── layout.tsx                  # Root layout
│   └── d/
│       └── [document_uuid]/
│           ├── page.tsx            # Document overview
│           └── p/
│               └── [page_num]/
│                   └── page.tsx    # Page viewer with drawing
├── components/
│   ├── PdfUploader.tsx
│   ├── PdfViewer.tsx
│   ├── PageGrid.tsx
│   ├── Canvas.tsx
│   ├── DrawingTools.tsx
│   ├── ScaleTool.tsx
│   └── ElementsTable.tsx
├── lib/
│   ├── supabase.ts                 # Supabase client
│   └── utils.ts
├── store/
│   └── useStore.ts                 # Zustand store
├── types/
│   └── index.ts
└── package.json
```

---

## 5. Questions / Clarifications Needed

1. **Authentication:** Will be added later
2. **Scale Units:** Only meters for MVP
3. **Polyline Editing:** Should users be able to edit existing polylines after creation? - yes, users should be able to click an element to select it. Then, they can edit a point or the coordinates of a polyline by clicking and dragging it
4. **Mobile Support:** Is responsive design for mobile/tablet needed - not for MVP
5. **Performance:** Expected PDF size and page count? - up to 24"x36", up to 20 pages

---

## 6. Out of Scope (v1)

- User authentication (deferred)
- PDF text extraction
- Export functionality
- Collaboration features