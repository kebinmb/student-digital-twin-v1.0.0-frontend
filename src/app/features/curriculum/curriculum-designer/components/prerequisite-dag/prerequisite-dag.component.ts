import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import cytoscape, { Core, EdgeSingular, EventObject, NodeSingular } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { Button, ButtonModule } from 'primeng/button';
import { Dialog, DialogModule } from 'primeng/dialog';
import { Tag, TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { CurriculumDesignerStore } from '../../state/curriculum-designer.store';
import { CourseItemDto } from '../../../../../core/models/curriculum-designer.model';

interface SelectedEdgeInfo {
  sourceCode: string;
  targetCode: string;
  targetCourseId: number;
}

@Component({
  selector: 'app-prerequisite-dag',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, ButtonModule, Dialog, DialogModule, Tag, TagModule, TooltipModule],
  template: `
    <div class="dag-canvas-card">
      
      <!-- DAG Visualizer Floating Toolbar -->
      <div class="dag-toolbar">
        <p-button
          icon="pi pi-search-plus"
          size="small"
          [text]="true"
          severity="secondary"
          (onClick)="zoomIn()"
          pTooltip="Zoom In">
        </p-button>
        <p-button
          icon="pi pi-search-minus"
          size="small"
          [text]="true"
          severity="secondary"
          (onClick)="zoomOut()"
          pTooltip="Zoom Out">
        </p-button>
        <p-button
          icon="pi pi-arrows-alt"
          size="small"
          [text]="true"
          severity="secondary"
          (onClick)="fitGraph()"
          pTooltip="Fit View">
        </p-button>
        <div class="toolbar-divider"></div>
        <p-button
          icon="pi pi-refresh"
          label="Re-layout"
          size="small"
          severity="info"
          [outlined]="true"
          (onClick)="renderGraph()">
        </p-button>
        @if (store.canEdit()) {
          <p-button
            icon="pi pi-plus-circle"
            label="Add Prerequisite"
            size="small"
            severity="success"
            (onClick)="openAddModal()">
          </p-button>
        }
      </div>

      <!-- Graph Legend Overlay -->
      <div class="dag-legend">
        <div class="legend-item">
          <span class="legend-dot dot-prereq"></span>
          <span>Prerequisites</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot dot-next"></span>
          <span>Next Courses</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot dot-independent"></span>
          <span>Independent</span>
        </div>
      </div>

      <!-- Cytoscape Canvas Container -->
      <div #cyContainer class="cy-viewport"></div>

      <!-- Empty Canvas Overlay if 0 courses -->
      @if (allCurriculumCourses().length === 0) {
        <div class="dag-empty-overlay">
          <div class="empty-icon-circle">
            <i class="pi pi-sitemap"></i>
          </div>
          <h3 class="empty-title">No Subjects in Curriculum</h3>
          <p class="empty-description">
            This curriculum does not have any subjects placed on the Year / Semester Board yet.
            Allocate subjects from the Course Palette onto the board to generate the prerequisite Directed Acyclic Graph (DAG).
          </p>
          <p-button
            icon="pi pi-table"
            label="Go to Year / Semester Board"
            size="small"
            severity="primary"
            (onClick)="goToBoard()">
          </p-button>
        </div>
      }

      <!-- Selected Node Card -->
      @if (selectedCourseNode()) {
        <div class="selected-node-panel">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.35rem;">
            <span style="font-weight: 700; font-size: 0.875rem; color: #ffffff;">{{ selectedCourseNode()?.code }}</span>
            <p-tag [value]="selectedCourseNode()?.creditUnits + ' Units'" severity="info"></p-tag>
          </div>
          <p style="font-size: 0.75rem; color: #94a3b8; margin: 0 0 0.75rem;">{{ selectedCourseNode()?.title }}</p>
          
          <div style="font-size: 0.6875rem; color: #94a3b8; display: flex; flex-direction: column; gap: 0.25rem;">
            <div>Category: <span style="color: #e2e8f0; font-weight: 500;">{{ selectedCourseNode()?.category }}</span></div>
            <div>Prerequisites: 
              @if ((selectedCourseNode()?.prerequisites || []).length === 0) {
                <span style="color: #64748b; font-style: italic;">None</span>
              } @else {
                <span style="color: #22d3ee; font-weight: 600;">{{ (selectedCourseNode()?.prerequisites || []).join(', ') }}</span>
              }
            </div>
          </div>
          <button (click)="selectedCourseNode.set(null)" style="background: none; border: none; font-size: 0.6875rem; color: #94a3b8; text-decoration: underline; cursor: pointer; margin-top: 0.75rem; padding: 0;">
            Dismiss
          </button>
        </div>
      }

      <!-- Selected Edge Inspection & Deletion Popover -->
      @if (selectedEdge()) {
        <div class="selected-edge-panel">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
            <span style="font-weight: 700; font-size: 0.75rem; color: #ffffff;">Prerequisite Dependency</span>
            <button (click)="selectedEdge.set(null)" style="background: none; border: none; color: #94a3b8; cursor: pointer;">
              <i class="pi pi-times" style="font-size: 0.75rem;"></i>
            </button>
          </div>
          <p style="font-size: 0.75rem; color: #cbd5e1; margin: 0;">
            <span style="font-weight: 600; color: #22d3ee;">{{ selectedEdge()?.sourceCode }}</span> is required before taking <span style="font-weight: 600; color: #34d399;">{{ selectedEdge()?.targetCode }}</span>.
          </p>
          @if (store.canEdit()) {
            <p-button
              icon="pi pi-trash"
              label="Delete Dependency"
              size="small"
              severity="danger"
              [outlined]="true"
              [disabled]="store.isSaving()"
              (onClick)="onDeleteSelectedEdge()">
            </p-button>
          }
        </div>
      }

      <!-- Add Prerequisite Dependency Dialog -->
      <p-dialog
        header="Create Prerequisite Edge"
        [visible]="isAddModalOpen()"
        (visibleChange)="isAddModalOpen.set($event)"
        [modal]="true"
        [style]="{ width: '520px', maxWidth: '95vw' }">
        
        @if (allCurriculumCourses().length < 2) {
          <div class="empty-prereq-alert">
            <div class="alert-icon-box">
              <i class="pi pi-info-circle"></i>
            </div>
            <div class="alert-content">
              <h4 class="alert-title">Insufficient Subjects in Curriculum</h4>
              <p class="alert-text">
                At least <strong>two subjects</strong> must be placed on the Year / Semester Board before creating prerequisite dependencies.
                Currently, this curriculum has <strong>{{ allCurriculumCourses().length }}</strong> subject(s) allocated.
              </p>
              <div>
                <p-button
                  label="Go to Year / Semester Board"
                  icon="pi pi-table"
                  size="small"
                  severity="primary"
                  (onClick)="goToBoard()">
                </p-button>
              </div>
            </div>
          </div>
        } @else {
          <div style="display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0;">
            <div class="dialog-field-group">
              <label for="targetSelect" style="font-size: 0.75rem; font-weight: 600; color: #374151; margin-bottom: 0.25rem;">Target Subject (requires prerequisite)</label>
              <select
                id="targetSelect"
                class="dialog-select-control"
                [ngModel]="targetCourseId()"
                (ngModelChange)="targetCourseId.set($event ? +$event : null)">
                <option [ngValue]="null" disabled selected>-- Select target subject --</option>
                @for (course of allCurriculumCourses(); track course.courseId) {
                  <option [value]="course.courseId">{{ course.code }} - {{ course.title }}</option>
                }
              </select>
            </div>

            <div class="dialog-field-group">
              <label for="prereqSelect" style="font-size: 0.75rem; font-weight: 600; color: #374151; margin-bottom: 0.25rem;">Prerequisite Subject (must be passed first)</label>
              <select
                id="prereqSelect"
                class="dialog-select-control"
                [ngModel]="prereqCourseId()"
                (ngModelChange)="prereqCourseId.set($event ? +$event : null)">
                <option [ngValue]="null" disabled selected>-- Select prerequisite subject --</option>
                @for (course of allCurriculumCourses(); track course.courseId) {
                  <option [value]="course.courseId">{{ course.code }} - {{ course.title }}</option>
                }
              </select>
            </div>

            @if (isSelfReferential()) {
              <div class="self-ref-warning">
                <i class="pi pi-exclamation-triangle" style="margin-right: 0.35rem;"></i>
                A subject cannot be a prerequisite of itself.
              </div>
            }

            <div class="dialog-field-group">
              <label for="ruleSelect" style="font-size: 0.75rem; font-weight: 600; color: #374151; margin-bottom: 0.25rem;">Rule Type</label>
              <select
                id="ruleSelect"
                class="dialog-select-control"
                [ngModel]="ruleType()"
                (ngModelChange)="ruleType.set($event)">
                <option value="HARD">HARD (Mandatory passing grade)</option>
                <option value="CO_REQUISITE">CO-REQUISITE (Concurrent enrolment allowed)</option>
                <option value="STANDING">STANDING (Year-level standing requirement)</option>
              </select>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9;">
              <p-button
                label="Cancel"
                size="small"
                [outlined]="true"
                severity="secondary"
                (onClick)="isAddModalOpen.set(false)">
              </p-button>
              <p-button
                label="Save Dependency"
                icon="pi pi-check"
                size="small"
                severity="primary"
                [disabled]="!canSavePrerequisite()"
                (onClick)="onSavePrerequisite()">
              </p-button>
            </div>
          </div>
        }
      </p-dialog>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .dag-canvas-card {
      position: relative;
      width: 100%;
      height: 700px;
      border: 1px solid #334155;
      border-radius: 14px;
      background: #020617;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
    }

    .dag-toolbar {
      position: absolute;
      top: 1rem;
      left: 1rem;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      border: 1px solid #334155;
      padding: 0.5rem;
      border-radius: 10px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }

    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: #334155;
      margin: 0 0.25rem;
    }

    .dag-legend {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 0.875rem;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      border: 1px solid #334155;
      padding: 0.5rem 0.875rem;
      border-radius: 10px;
      font-size: 0.75rem;
      color: #cbd5e1;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dot-prereq { background: #22d3ee; }
    .dot-next { background: #34d399; }
    .dot-independent { background: #64748b; }

    .cy-viewport {
      width: 100%;
      flex: 1;
    }

    .dag-empty-overlay {
      position: absolute;
      inset: 0;
      z-index: 5;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98));
      padding: 2rem;
      text-align: center;
    }

    .empty-icon-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
      font-size: 1.75rem;
      margin-bottom: 1rem;
    }

    .empty-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 0.5rem 0;
    }

    .empty-description {
      font-size: 0.8125rem;
      color: #94a3b8;
      max-width: 440px;
      line-height: 1.5;
      margin: 0 0 1.25rem 0;
    }

    .empty-prereq-alert {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-radius: 10px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      align-items: flex-start;
    }

    .alert-icon-box {
      font-size: 1.5rem;
      color: #2563eb;
      margin-top: 0.125rem;
    }

    .alert-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .alert-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: #1e3a8a;
      margin: 0;
    }

    .alert-text {
      font-size: 0.8125rem;
      color: #1e40af;
      line-height: 1.4;
      margin: 0 0 0.5rem 0;
    }

    .self-ref-warning {
      font-size: 0.75rem;
      color: #dc2626;
      font-weight: 600;
      display: flex;
      align-items: center;
      margin-top: -0.25rem;
      margin-bottom: 0.25rem;
    }

    .selected-node-panel {
      position: absolute;
      bottom: 1rem;
      left: 1rem;
      z-index: 10;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid #334155;
      padding: 1rem;
      border-radius: 12px;
      max-width: 360px;
      color: #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }

    .selected-edge-panel {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      z-index: 10;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid #334155;
      padding: 1rem;
      border-radius: 12px;
      max-width: 320px;
      color: #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .dialog-field-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 0.875rem;
    }

    .dialog-select-control {
      width: 100%;
      padding: 0.625rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.8125rem;
      background: #f8fafc;
      color: #1e293b;
    }

    .dialog-select-control:focus {
      outline: none;
      border-color: #116834;
      background: #ffffff;
    }
  `]
})
export class PrerequisiteDagComponent implements AfterViewInit, OnDestroy {
  readonly store = inject(CurriculumDesignerStore);
  private readonly messageService = inject(MessageService);

  @ViewChild('cyContainer') cyContainer!: ElementRef<HTMLDivElement>;
  private cy: Core | null = null;

  readonly selectedCourseNode = signal<CourseItemDto | null>(null);
  readonly selectedEdge = signal<SelectedEdgeInfo | null>(null);
  readonly isAddModalOpen = signal<boolean>(false);

  readonly targetCourseId = signal<number | null>(null);
  readonly prereqCourseId = signal<number | null>(null);
  readonly ruleType = signal<string>('HARD');

  readonly allCurriculumCourses = computed<CourseItemDto[]>(() => {
    const curr = this.store.curriculum();
    if (!curr || !curr.yearBlocks) return [];
    const list: CourseItemDto[] = [];
    for (const y of curr.yearBlocks) {
      for (const s of y.semesters) {
        if (s.courses) {
          list.push(...s.courses);
        }
      }
    }
    return list;
  });

  readonly isSelfReferential = computed(() => {
    const t = this.targetCourseId();
    const p = this.prereqCourseId();
    return t !== null && p !== null && t === p;
  });

  readonly canSavePrerequisite = computed(() => {
    const t = this.targetCourseId();
    const p = this.prereqCourseId();
    return t !== null && p !== null && t > 0 && p > 0 && t !== p && !this.store.isSaving();
  });

  constructor() {
    effect(() => {
      const curr = this.store.curriculum();
      if (curr && this.cy) {
        this.renderGraph();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initCytoscape();
  }

  ngOnDestroy(): void {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
  }

  openAddModal(): void {
    this.targetCourseId.set(null);
    this.prereqCourseId.set(null);
    this.ruleType.set('HARD');
    this.isAddModalOpen.set(true);
  }

  goToBoard(): void {
    this.isAddModalOpen.set(false);
    this.store.activeTab.set('board');
  }

  private initCytoscape(): void {
    if (!this.cyContainer) return;

    try {
      cytoscape.use(dagre);
    } catch {
      // plugin already registered
    }

    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        {
          selector: 'node',
          style: {
            'content': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#f8fafc',
            'font-family': 'system-ui, sans-serif',
            'font-size': '11px',
            'font-weight': 'bold',
            'background-color': '#1e293b',
            'border-width': 2,
            'border-color': '#475569',
            'width': 100,
            'height': 44,
            'shape': 'round-rectangle'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#38bdf8',
            'border-width': 3,
            'background-color': '#0f172a'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#475569',
            'target-arrow-color': '#64748b',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'width': 3,
            'line-color': '#f43f5e',
            'target-arrow-color': '#f43f5e'
          }
        },
        {
          selector: '.highlight-upstream',
          style: {
            'border-color': '#22d3ee',
            'background-color': '#083344',
            'line-color': '#22d3ee',
            'target-arrow-color': '#22d3ee',
            'width': 3
          }
        },
        {
          selector: '.highlight-downstream',
          style: {
            'border-color': '#34d399',
            'background-color': '#064e3b',
            'line-color': '#34d399',
            'target-arrow-color': '#34d399',
            'width': 3
          }
        }
      ]
    });

    this.cy.on('tap', 'node', (evt: EventObject) => {
      const node: NodeSingular = evt.target;
      const course = node.data('course') as CourseItemDto;
      this.selectedCourseNode.set(course);
      this.selectedEdge.set(null);
      this.highlightConnections(node);
    });

    this.cy.on('tap', 'edge', (evt: EventObject) => {
      const edge: EdgeSingular = evt.target;
      this.selectedEdge.set({
        sourceCode: edge.data('sourceCode'),
        targetCode: edge.data('targetCode'),
        targetCourseId: edge.data('targetCourseId')
      });
      this.selectedCourseNode.set(null);
    });

    this.cy.on('tap', (evt: EventObject) => {
      if (evt.target === this.cy) {
        this.selectedCourseNode.set(null);
        this.selectedEdge.set(null);
        this.clearHighlights();
      }
    });

    this.renderGraph();
  }

  renderGraph(): void {
    if (!this.cy) return;

    this.cy.elements().remove();
    this.selectedCourseNode.set(null);
    this.selectedEdge.set(null);

    const courses = this.allCurriculumCourses();
    if (!this.cy || courses.length === 0) return;

    // 1. Add Subject Nodes
    const courseCodeToIdMap = new Map<string, number>();
    for (const c of courses) {
      courseCodeToIdMap.set(c.code, c.courseId);
      this.cy.add({
        group: 'nodes',
        data: {
          id: `c_${c.courseId}`,
          label: c.code,
          course: c
        }
      });
    }

    // 2. Add Directed Prerequisite Edges
    for (const c of courses) {
      for (const prereqCode of c.prerequisites || []) {
        const prereqId = courseCodeToIdMap.get(prereqCode);
        if (prereqId) {
          this.cy.add({
            group: 'edges',
            data: {
              id: `e_${prereqId}_${c.courseId}`,
              source: `c_${prereqId}`,
              target: `c_${c.courseId}`,
              sourceCode: prereqCode,
              targetCode: c.code,
              targetCourseId: c.courseId
            }
          });
        }
      }
    }

    // 3. Run Dagre Hierarchical Layout with strict options typing
    const layout = this.cy.layout({
      name: 'dagre',
      rankDir: 'TB',
      nodeSep: 50,
      rankSep: 70,
      padding: 30
    } as cytoscape.LayoutOptions);

    layout.run();
    this.fitGraph();
  }

  private highlightConnections(node: NodeSingular): void {
    if (!this.cy) return;
    this.clearHighlights();

    const incomers = node.incomers();
    incomers.addClass('highlight-upstream');

    const outgoers = node.outgoers();
    outgoers.addClass('highlight-downstream');
  }

  private clearHighlights(): void {
    if (!this.cy) return;
    this.cy.elements().removeClass('highlight-upstream highlight-downstream');
  }

  zoomIn(): void {
    if (this.cy) {
      this.cy.zoom(this.cy.zoom() * 1.25);
    }
  }

  zoomOut(): void {
    if (this.cy) {
      this.cy.zoom(this.cy.zoom() * 0.8);
    }
  }

  fitGraph(): void {
    if (this.cy) {
      this.cy.fit(undefined, 30);
    }
  }

  onSavePrerequisite(): void {
    const target = this.targetCourseId();
    const prereq = this.prereqCourseId();
    if (!target || !prereq || target === prereq) return;

    this.isAddModalOpen.set(false);
    this.store.addPrerequisite(target, prereq, this.ruleType());
  }

  onDeleteSelectedEdge(): void {
    const edge = this.selectedEdge();
    if (!edge) return;
    this.selectedEdge.set(null);
    this.messageService.add({
      severity: 'info',
      summary: 'Dependency Selected',
      detail: `Prerequisite ${edge.sourceCode} -> ${edge.targetCode} identified for deletion.`
    });
  }
}
