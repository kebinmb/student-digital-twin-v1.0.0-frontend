import { Injectable, signal } from '@angular/core';
import { StudentSelfServiceSummaryDto, EnrolledCourseSummaryDto } from '../models/lms.model';

export interface CachedStudentPass {
  studentId: number;
  studentNumber: string;
  studentName: string;
  programCode: string;
  yearLevel: number;
  cumulativeGpa: string;
  totalUnitsEarned: string;
  financialClearance: string;
  departmentalClearance: string;
  academicStandingLabel: string;
  cachedAt: string;
  courses: EnrolledCourseSummaryDto[];
  verificationToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineStudentCardService {
  private readonly STORAGE_KEY = 'sdt_offline_student_pass';

  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly cachedPass = signal<CachedStudentPass | null>(this.loadFromStorage());

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOnline.set(true));
      window.addEventListener('offline', () => this.isOnline.set(false));
    }
  }

  savePass(summary: StudentSelfServiceSummaryDto, standingLabel: string = 'Good Standing'): void {
    if (!summary || !summary.studentNumber) return;

    const pass: CachedStudentPass = {
      studentId: summary.studentId,
      studentNumber: summary.studentNumber,
      studentName: summary.studentName,
      programCode: summary.programCode,
      yearLevel: summary.yearLevel,
      cumulativeGpa: summary.cumulativeGpa,
      totalUnitsEarned: summary.totalUnitsEarned || '0.00',
      financialClearance: summary.financialClearance,
      departmentalClearance: summary.departmentalClearance,
      academicStandingLabel: standingLabel,
      cachedAt: new Date().toISOString(),
      courses: summary.currentCourses || [],
      verificationToken: `SDT-PASS-${summary.studentNumber}-${Date.now().toString(36).toUpperCase()}`
    };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pass));
      this.cachedPass.set(pass);
    } catch (e) {
      console.warn('Failed to save offline pass to local storage:', e);
    }
  }

  private loadFromStorage(): CachedStudentPass | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  clearCachedPass(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.cachedPass.set(null);
  }

  /**
   * Generates a clean SVG barcode for the student number (Code 39 pattern)
   * Rendered client-side with 0 external network requests for 100% offline gate pass scanning.
   */
  generateBarcodeSvg(text: string): string {
    const clean = (text || '000000').toUpperCase().replace(/[^A-Z0-9\-]/g, '');
    const chars = `*${clean}*`;
    
    // Code 39 binary patterns (9 elements: b=bar, s=space, 1=wide, 0=narrow)
    const patterns: Record<string, string> = {
      '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
      '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
      '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
      'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
      'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
      'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
      'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
      'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
      'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
      '-': '010000101', '*': '010010100'
    };

    let x = 10;
    const narrow = 2;
    const wide = 5;
    const height = 45;
    const rects: string[] = [];

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const pattern = patterns[char] || patterns['0'];
      for (let j = 0; j < 9; j++) {
        const isBar = j % 2 === 0;
        const isWide = pattern[j] === '1';
        const width = isWide ? wide : narrow;
        if (isBar) {
          rects.push(`<rect x="${x}" y="5" width="${width}" height="${height}" fill="#1e293b"/>`);
        }
        x += width;
      }
      x += narrow; // inter-character gap
    }

    const totalWidth = x + 10;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} 65" class="w-full h-16">
      ${rects.join('')}
      <text x="${totalWidth / 2}" y="60" text-anchor="middle" font-family="monospace" font-size="10" fill="#475569" font-weight="bold">${clean}</text>
    </svg>`;
  }
}
