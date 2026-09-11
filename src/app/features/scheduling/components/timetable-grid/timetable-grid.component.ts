import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy, signal, computed, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SchedulingStore } from '../../state/scheduling.store';

import { Skeleton } from 'primeng/skeleton';

export interface GridSlotItem {
  sectionCode: string;
  courseCode: string;
  roomCode: string;
  instructorName: string;
  instructorUserId?: number | null;
  startTime: string;
  endTime: string;
  scheduleType: string;
  dayOfWeek: string;
}

@Component({
  selector: 'app-timetable-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, ButtonModule, TagModule, Skeleton],
  templateUrl: './timetable-grid.component.html',
  styleUrls: ['./timetable-grid.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimetableGridComponent {
  readonly store = inject(SchedulingStore);

  readonly addSchedule = output<void>();

  readonly selectedRoomId = signal<number | null>(null);

  readonly days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  readonly timeSlots = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  readonly filteredSchedules = computed(() => {
    const roomId = this.selectedRoomId();
    const sections = this.store.sections();

    const items: GridSlotItem[] = [];
    sections.forEach(sec => {
      sec.schedules.forEach(slot => {
        if (!roomId || slot.roomId === roomId) {
          items.push({
            sectionCode: sec.sectionCode,
            courseCode: sec.courseCode,
            roomCode: slot.roomCode,
            instructorName: slot.instructorName || 'TBA',
            instructorUserId: slot.instructorUserId,
            startTime: slot.startTime,
            endTime: slot.endTime,
            scheduleType: slot.scheduleType,
            dayOfWeek: slot.dayOfWeek
          });
        }
      });
    });
    return items;
  });

  getSlotsForDay(day: string): GridSlotItem[] {
    return this.filteredSchedules().filter(item => item.dayOfWeek === day);
  }

  onRoomChange(roomId: number | { value: number } | string | null): void {
    const id = (roomId && typeof roomId === 'object' && 'value' in roomId)
      ? roomId.value
      : (roomId !== null && roomId !== undefined ? Number(roomId) : null);
    this.selectedRoomId.set(id);
  }

  resetFilter(): void {
    this.selectedRoomId.set(null);
  }

  onAddSchedule(): void {
    this.store.requestOpenCreateModal();
    this.addSchedule.emit();
  }
}
