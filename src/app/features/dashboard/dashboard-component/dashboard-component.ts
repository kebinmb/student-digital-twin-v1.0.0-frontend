import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// PrimeNG Standalone Components
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Skeleton } from 'primeng/skeleton';
import { ProgressBar } from 'primeng/progressbar';
import { Tag } from 'primeng/tag';
import { Drawer } from 'primeng/drawer';

import { AuthService } from '../../../core/service/authentication/auth-service';

export interface MetricCard {
  title: string;
  value: string;
  subtext: string;
  icon: string;
  trend?: string;
  trendUp?: boolean;
}

export interface ClassScheduleItem {
  courseCode: string;
  courseTitle: string;
  time: string;
  room: string;
  instructor: string;
  status: 'In Progress' | 'Upcoming' | 'Completed';
}

export interface CompetencyItem {
  skill: string;
  score: number;
  category: string;
}

export interface NoticeItem {
  id: string;
  title: string;
  category: string;
  date: string;
  unread: boolean;
}

@Component({
  selector: 'app-dashboard-component',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    Button,
    Card,
    Skeleton,
    ProgressBar,
    Tag,
    Drawer
  ],
  templateUrl: './dashboard-component.html',
  styleUrls: ['./dashboard-component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(false);
  readonly selectedNotice = signal<NoticeItem | null>(null);
  readonly isNoticeDrawerOpen = signal(false);

  readonly studentName = computed(() => this.authService.currentUser().username || 'Student User');
  readonly currentTime = signal(new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }));

  // Overview KPI metric cards
  readonly metrics: MetricCard[] = [
    {
      title: 'Current GWA',
      value: '1.38',
      subtext: "Dean's Honor List",
      icon: 'pi pi-chart-line',
      trend: '+0.04 vs last term',
      trendUp: true
    },
    {
      title: 'Curriculum Progress',
      value: '84 / 142',
      subtext: '59% Units Completed',
      icon: 'pi pi-graduation-cap',
      trend: 'On Track',
      trendUp: true
    },
    {
      title: 'Attendance Rate',
      value: '98.4%',
      subtext: '0 unexcused absences',
      icon: 'pi pi-check-circle',
      trend: 'Exemplary',
      trendUp: true
    },
    {
      title: 'Twin Model Sync',
      value: '99.8%',
      subtext: 'Telemetry Up-to-date',
      icon: 'pi pi-sparkles',
      trend: 'Active',
      trendUp: true
    }
  ];

  // Today's schedule
  readonly todayClasses: ClassScheduleItem[] = [
    {
      courseCode: 'IT 311',
      courseTitle: 'Enterprise Architecture & Cloud Systems',
      time: '08:00 AM - 10:00 AM',
      room: 'IT Building - Lab 304',
      instructor: 'Engr. J. Dela Cruz',
      status: 'Completed'
    },
    {
      courseCode: 'CS 320',
      courseTitle: 'Modern Software Engineering & DevOps',
      time: '10:30 AM - 12:30 PM',
      room: 'Main Tech Center - Rm 201',
      instructor: 'Prof. M. Santos',
      status: 'In Progress'
    },
    {
      courseCode: 'IT 314',
      courseTitle: 'Data Communications & IoT Networks',
      time: '02:00 PM - 04:00 PM',
      room: 'Networking Lab - Rm 102',
      instructor: 'Dr. R. Alcantara',
      status: 'Upcoming'
    }
  ];

  // Digital Twin Competency Profiling
  readonly competencies: CompetencyItem[] = [
    { skill: 'Full-Stack Web Architecture', score: 94, category: 'Software Development' },
    { skill: 'Distributed Database Systems', score: 88, category: 'Data & Systems' },
    { skill: 'Information Security Protocols', score: 91, category: 'Cybersecurity' },
    { skill: 'Algorithmic Problem Solving', score: 86, category: 'Core Computing' }
  ];

  // Academic announcements
  readonly notices: NoticeItem[] = [
    {
      id: '1',
      title: 'Midterm Examination Schedule AY 2026-2027 Released',
      category: 'Registrar',
      date: 'Today, 9:00 AM',
      unread: true
    },
    {
      id: '2',
      title: 'Online Encoding of Student Clearance Now Open',
      category: 'Student Affairs',
      date: 'Yesterday',
      unread: false
    },
    {
      id: '3',
      title: 'CHMSU ICT Helpdesk Maintenance on Saturday 10 PM',
      category: 'ICT Office',
      date: '2 days ago',
      unread: false
    }
  ];

  openNoticeDetail(notice: NoticeItem): void {
    this.selectedNotice.set(notice);
    this.isNoticeDrawerOpen.set(true);
  }
}
