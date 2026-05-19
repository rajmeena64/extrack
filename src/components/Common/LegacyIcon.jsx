import React from 'react';
import {
  ArrowLeft,
  Camera,
  CalendarDays,
  ChartColumn,
  ChartLine,
  ChevronDown,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleUserRound,
  CloudUpload,
  Code2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Grid2x2,
  Hand,
  Home,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  LogOut,
  Moon,
  NotebookPen,
  PenSquare,
  PieChart,
  Plus,
  PlusCircle,
  Plug,
  Settings,
  StickyNote,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';

import './LegacyIcon.css';

const ICON_MAP = {
  'fa-arrow-left': ArrowLeft,
  'fa-camera': Camera,
  'fa-calendar-alt': CalendarDays,
  'fa-chart-line': ChartLine,
  'fa-chart-pie': PieChart,
  'fa-check-circle': CircleCheck,
  'fa-chevron-down': ChevronDown,
  'fa-circle': Circle,
  'fa-cloud-upload-alt': CloudUpload,
  'fa-cog': Settings,
  'fa-code': Code2,
  'fa-edit': PenSquare,
  'fa-exclamation-triangle': TriangleAlert,
  'fa-eye': Eye,
  'fa-eye-slash': EyeOff,
  'fa-file-csv': FileSpreadsheet,
  'fa-file-excel': FileSpreadsheet,
  'fa-hand-paper': Hand,
  'fa-home': Home,
  'fa-link': Link2,
  'fa-moon': Moon,
  'fa-plus': Plus,
  'fa-plus-circle': PlusCircle,
  'fa-plug': Plug,
  'fa-sign-out-alt': LogOut,
  'fa-spinner': LoaderCircle,
  'fa-sticky-note': StickyNote,
  'fa-tachometer-alt': LayoutDashboard,
  'fa-th-large': Grid2x2,
  'fa-times': X,
  'fa-trash': Trash2,
  'fa-trash-alt': Trash2,
  'fa-upload': Upload,
  'fa-user-circle': CircleUserRound,
  'fa-user-edit': NotebookPen,
  'fa-chess-board': ChartColumn,
};

function LegacyIcon({ className = '', size = 16, strokeWidth = 2, ...props }) {
  const tokens = className.split(/\s+/).filter(Boolean);
  const iconToken = tokens.find((token) => token.startsWith('fa-'));
  const IconComponent = ICON_MAP[iconToken] || CircleAlert;
  const passthroughClasses = tokens.filter(
    (token) => !['fas', 'far', 'fab', iconToken].includes(token)
  );

  return (
    <span
      className={['legacy-icon', ...passthroughClasses].join(' ').trim()}
      aria-hidden="true"
    >
      <IconComponent size={size} strokeWidth={strokeWidth} {...props} />
    </span>
  );
}

export default LegacyIcon;
