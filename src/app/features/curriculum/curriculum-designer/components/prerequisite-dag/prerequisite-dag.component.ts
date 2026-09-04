import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked
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
  templateUrl: './prerequisite-dag.component.html',
  styleUrl: './prerequisite-dag.component.css'
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
        untracked(() => {
          this.renderGraph();
        });
      }
    }, { allowSignalWrites: true });
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

    // 3. Ensure container is measured and run Dagre Hierarchical Layout with strict options typing
    this.cy.resize();
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
