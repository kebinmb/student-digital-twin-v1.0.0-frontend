export type NoticeCategory =
  | 'Registrar'
  | 'Student Affairs'
  | 'ICT Office'
  | 'Academic Affairs'
  | 'College Dean'
  | 'Department'
  | 'Guidance & Counseling'
  | 'Accounting & Finance'
  | 'General';

export type NoticeAudience = 'ALL' | 'STUDENT' | 'FACULTY' | 'STAFF';

export interface NoticeItem {
  id: string;
  title: string;
  category: string;
  date: string;
  unread: boolean;
  content?: string;
  audience?: NoticeAudience;
  priority?: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  authorName?: string;
  isPinned?: boolean;
}

export interface CreateNoticeRequest {
  title: string;
  category: string;
  content: string;
  audience?: NoticeAudience;
  priority?: 'NORMAL' | 'IMPORTANT' | 'URGENT';
}
