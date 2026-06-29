import { Component, OnInit, OnDestroy, AfterViewInit, signal, computed, ViewChild, ElementRef, inject, HostListener } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { ImageService, ResizeJob, ResizeOutput } from "../../../services/image/image.service";

interface PresetGroup {
  category: string;
  items: { label: string; width: number; height: number }[];
}

const PRESET_GROUPS: PresetGroup[] = [
  {
    category: "Screen Sizes",
    items: [
      { label: "Mobile Small", width: 320, height: 480 },
      { label: "Mobile Standard", width: 375, height: 667 },
      { label: "Mobile Large", width: 414, height: 896 },
      { label: "Tablet Portrait", width: 768, height: 1024 },
      { label: "Tablet Landscape", width: 1024, height: 768 },
      { label: "Desktop HD", width: 1280, height: 720 },
      { label: "Desktop Full HD", width: 1920, height: 1080 },
    ],
  },
  {
    category: "Card & Widget",
    items: [
      { label: "Card Small", width: 300, height: 200 },
      { label: "Card Medium", width: 400, height: 300 },
      { label: "Card Large", width: 600, height: 400 },
      { label: "Hero Banner", width: 1200, height: 400 },
      { label: "Email Header", width: 600, height: 200 },
    ],
  },
  {
    category: "Ad Sizes",
    items: [
      { label: "Leaderboard", width: 728, height: 90 },
      { label: "Rectangle", width: 300, height: 250 },
      { label: "Skyscraper", width: 160, height: 600 },
    ],
  },
  {
    category: "Avatar & Icon",
    items: [
      { label: "Avatar Small", width: 32, height: 32 },
      { label: "Avatar Medium", width: 64, height: 64 },
      { label: "Avatar Large", width: 128, height: 128 },
      { label: "Favicon", width: 16, height: 16 },
      { label: "App Icon", width: 512, height: 512 },
    ],
  },
  {
    category: "Social",
    items: [
      { label: "Social Card", width: 1200, height: 630 },
      { label: "Instagram Post", width: 1080, height: 1080 },
      { label: "Story", width: 1080, height: 1920 },
    ],
  },
];

const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 175, 200];

@Component({
  selector: "pf-preview-tester",
  standalone: true,
  imports: [FormsModule, MatSelectModule, MatIconModule],
  styles: `
    ::ng-deep .image-select .mat-mdc-select-trigger {
      height: 32px !important;
      padding: 0 12px;
      font-size: 12px;
      border: 1px solid var(--pf-border);
      border-radius: 8px;
      background: var(--pf-surface);
    }
    ::ng-deep .image-select .mat-mdc-select-arrow-wrapper {
      padding-left: 4px;
    }
    ::ng-deep .image-select .mat-mdc-select-value-text {
      font-size: 12px;
      color: var(--pf-text-primary);
    }
    ::ng-deep .image-select .mat-mdc-select-placeholder {
      font-size: 12px;
      color: var(--pf-text-muted);
    }
    ::ng-deep .size-select .mat-mdc-select-trigger {
      height: 32px !important;
      padding: 0 12px;
      font-size: 12px;
      border: 1px solid var(--pf-border);
      border-radius: 8px;
      background: var(--pf-surface);
    }
    ::ng-deep .size-select .mat-mdc-select-arrow-wrapper {
      padding-left: 4px;
    }
    ::ng-deep .size-select .mat-mdc-select-value-text {
      font-size: 12px;
      color: var(--pf-text-primary);
    }
    ::ng-deep .size-select .mat-mdc-select-placeholder {
      font-size: 12px;
      color: var(--pf-text-muted);
    }
    ::ng-deep .image-select-panel .mat-mdc-option {
      min-height: 56px;
      padding: 8px 12px;
    }
    ::ng-deep .size-select-panel .mat-mdc-option {
      min-height: 48px;
      padding: 6px 12px;
    }
    ::ng-deep .image-select-panel {
      background: var(--pf-surface) !important;
      border: 1px solid var(--pf-border);
      border-radius: 8px;
    }
    ::ng-deep .size-select-panel {
      background: var(--pf-surface) !important;
      border: 1px solid var(--pf-border);
      border-radius: 8px;
    }
    ::ng-deep .mat-mdc-select-panel .mat-mdc-option.mat-mdc-option-active {
      background: rgba(0, 237, 100, 0.08);
    }
    ::ng-deep .mat-mdc-select-panel .mat-mdc-option:hover:not(.mdc-list-item--disabled) {
      background: rgba(0, 237, 100, 0.05);
    }
    ::ng-deep .mat-mdc-option .mdc-list-item__primary-text {
      width: 100%;
    }
    .image-option__row {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }
    .image-option__thumb {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 6px;
      flex-shrink: 0;
      background: var(--pf-surface-light);
    }
    .image-option__text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .image-option__name {
      font-size: 13px;
      font-weight: 500;
      color: var(--pf-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .image-option__meta {
      font-size: 11px;
      color: var(--pf-text-muted);
    }
    .image-option__right {
      flex-shrink: 0;
      text-align: right;
    }
    .image-option__count {
      font-size: 11px;
      color: var(--pf-accent);
      font-weight: 500;
    }
    .size-option__row {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .size-option__thumb {
      width: 32px;
      height: 32px;
      object-fit: cover;
      border-radius: 4px;
      flex-shrink: 0;
      background: var(--pf-surface-light);
    }
    .size-option__text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .size-option__name {
      font-size: 12px;
      font-weight: 500;
      color: var(--pf-text-primary);
    }
    .size-option__meta {
      font-size: 10px;
      color: var(--pf-text-muted);
    }
    .size-option__dims {
      flex-shrink: 0;
      text-align: right;
      font-size: 11px;
      color: var(--pf-text-muted);
      display: flex;
      flex-direction: column;
      gap: 1px;
      align-items: flex-end;
    }
    .size-option__size {
      font-size: 10px;
    }
    .selected-trigger {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .trigger-thumb {
      width: 24px;
      height: 24px;
      object-fit: cover;
      border-radius: 4px;
      flex-shrink: 0;
      background: var(--pf-surface-light);
    }
    .trigger-name {
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .trigger-placeholder {
      font-size: 12px;
      color: var(--pf-text-muted);
    }
    @media (max-width: 768px) {
      .image-option__thumb { width: 32px; height: 32px; }
      .trigger-name { max-width: 120px; }
    }
  `,
  template: `
    <div class="flex flex-col bg-primary-dark" style="height: calc(100vh - 104px); margin: -32px;">

      <!-- ===== TOP BAR ===== -->
      <div class="h-16 shrink-0 border-b border-border bg-surface flex items-center gap-3 px-5">
        <div class="hidden md:block shrink-0">
          <h2 class="text-base font-bold leading-tight">Preview Tester</h2>
          <p class="text-[11px] text-text-muted leading-tight">Test image fit and quality</p>
        </div>

        <div class="hidden md:block w-px h-8 bg-border shrink-0"></div>

        <!-- Source: job mode -->
        @if (sourceMode() === 'jobs') {
          <mat-select [ngModel]="selectedJobId()" (ngModelChange)="onJobSelect($event)"
                      class="image-select w-[200px] lg:w-[260px]"
                      panelClass="image-select-panel">
            <mat-select-trigger>
              @if (selectedJobFromList(); as job) {
                <div class="selected-trigger">
                  <img [src]="job.thumbnail_url" class="trigger-thumb"
                       (error)="onThumbError($event)" />
                  <span class="trigger-name">{{ job.original_filename }}</span>
                </div>
              } @else {
                <span class="trigger-placeholder">Select an image</span>
              }
            </mat-select-trigger>
            @for (job of doneJobs(); track job.id) {
              <mat-option [value]="job.id" class="image-option">
                <div class="image-option__row">
                  <img [src]="job.thumbnail_url" class="image-option__thumb"
                       (error)="onThumbError($event)" />
                  <div class="image-option__text">
                    <span class="image-option__name">{{ job.original_filename }}</span>
                    <span class="image-option__meta">{{ job.original_width }} × {{ job.original_height }} · {{ job.original_format }}</span>
                  </div>
                  <div class="image-option__right">
                    <span class="image-option__count">{{ job.output_count }} size{{ job.output_count !== 1 ? 's' : '' }}</span>
                  </div>
                </div>
              </mat-option>
            } @empty {
              <mat-option disabled class="image-option">
                <span>No processed images found</span>
              </mat-option>
            }
          </mat-select>

          @if (doneJobs().length === 0) {
            <p class="text-[11px] text-text-muted mt-1 w-full">
              No processed images yet &middot;
              <a class="text-accent hover:underline cursor-pointer" (click)="navigateToResize()">Go to Resize</a>
            </p>
          }

          @if (jobOutputs().length > 0) {
            <svg class="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            <mat-select [ngModel]="selectedOutputId()" (ngModelChange)="onOutputSelect($event)"
                        class="size-select w-[180px] lg:w-[220px]"
                        panelClass="size-select-panel">
              <mat-select-trigger>
                @if (selectedOutput(); as out) {
                  <div class="selected-trigger">
                    <img [src]="out.output_url" class="trigger-thumb"
                         (error)="onThumbError($event)" />
                    <span class="trigger-name">{{ out.label }}</span>
                  </div>
                } @else {
                  <span class="trigger-placeholder">Select a size variant</span>
                }
              </mat-select-trigger>
              @for (output of jobOutputs(); track output.id) {
                <mat-option [value]="output.id" class="size-option">
                  <div class="size-option__row">
                    <img [src]="output.output_url" class="size-option__thumb"
                         (error)="onThumbError($event)" />
                    <div class="size-option__text">
                      <span class="size-option__name">{{ output.label }}</span>
                      <span class="size-option__meta">{{ output.preset_category || '—' }}</span>
                    </div>
                    <div class="size-option__dims">
                      <span>{{ output.width }} × {{ output.height }}</span>
                      <span class="size-option__size">{{ output.file_size_display || formatFileSize(output.file_size) }}</span>
                    </div>
                  </div>
                </mat-option>
              }
            </mat-select>
          }

          <button (click)="sourceMode.set('url')" class="text-[11px] text-accent hover:underline shrink-0 ml-1">Use image URL instead</button>
        } @else {
          <div class="flex items-center gap-2 flex-1 max-w-[420px]">
            <input type="url" placeholder="Paste image URL..."
                   [ngModel]="customImageUrl()" (ngModelChange)="onUrlChange($event)"
                   class="h-8 text-xs px-3 py-0" />
            @if (previewUrl()) {
              <button (click)="clearUrl()" class="text-xs text-text-muted hover:text-text-primary shrink-0">Clear</button>
            }
          </div>
          <button (click)="sourceMode.set('jobs')" class="text-[11px] text-accent hover:underline shrink-0">Use processed images</button>
        }

        <div class="flex-1 min-w-[8px]"></div>

        <!-- Actions -->
        <button (click)="copyPreview()" title="Copy preview as image"
                class="w-8 h-8 rounded-lg hover:bg-surface-light flex items-center justify-center text-text-secondary hover:text-accent transition shrink-0">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
        </button>
        <button (click)="downloadPreview()" title="Download preview"
                class="w-8 h-8 rounded-lg hover:bg-surface-light flex items-center justify-center text-text-secondary hover:text-accent transition shrink-0">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        </button>

        <div class="w-px h-6 bg-border shrink-0"></div>

        <!-- Zoom controls -->
        <div class="flex items-center gap-1">
          <button (click)="zoomLevel.set(Math.max(25, zoomLevel() - 25))" title="Zoom out"
                  class="w-7 h-7 rounded hover:bg-surface-light flex items-center justify-center text-text-secondary hover:text-text-primary transition text-sm font-bold">−</button>
          <span class="text-xs font-mono w-[44px] text-center tabular-nums">{{ zoomLevel() }}%</span>
          <button (click)="zoomLevel.set(Math.min(200, zoomLevel() + 25))" title="Zoom in"
                  class="w-7 h-7 rounded hover:bg-surface-light flex items-center justify-center text-text-secondary hover:text-text-primary transition text-sm font-bold">+</button>
        </div>

        <div class="w-px h-6 bg-border shrink-0 hidden sm:block"></div>

        <button (click)="resetAll()" class="text-xs text-text-muted hover:text-accent transition shrink-0 hidden sm:block">Reset All</button>

        <button title="Keyboard shortcuts" class="w-7 h-7 rounded-lg hover:bg-surface-light flex items-center justify-center text-text-muted hover:text-text-primary transition shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
        </button>
      </div>

      <!-- ===== BODY ===== -->
      <div class="flex-1 flex min-h-0">

        <!-- ===== LEFT PANEL ===== -->
        <div class="w-[280px] xl:w-[320px] shrink-0 border-r border-border bg-surface overflow-y-auto hidden lg:block">
          @for (section of accordionSections; track section.id) {
            <div class="border-b border-border">
              <button (click)="toggleSection(section.id)"
                      class="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface-light/40 transition">
                <svg class="w-3.5 h-3.5 text-text-muted shrink-0 transition"
                     [style.transform]="openSections().has(section.id) ? 'rotate(90deg)' : 'rotate(0deg)'"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
                <div class="flex-1 min-w-0">
                  <span class="text-sm font-medium">{{ section.label }}</span>
                  @if (section.summary(); as summary) {
                    <span class="text-[11px] text-text-muted ml-2">{{ summary }}</span>
                  }
                </div>
              </button>

              @if (openSections().has(section.id)) {
                <div class="px-5 pb-4 space-y-3">

                  <!-- SECTION: Widget Size -->
                  @if (section.id === 'size') {
                    <div>
                      <select #presetSelect [ngModel]="selectedPreset()" (ngModelChange)="onPresetSelect($event)"
                              class="h-8 text-xs px-3 py-0">
                        <option value="">Common Sizes...</option>
                        @for (group of presetGroups; track group.category) {
                          <optgroup [label]="group.category">
                            @for (item of group.items; track item.label) {
                              <option [value]="item.label">{{ item.label }} &mdash; {{ item.width }}x{{ item.height }}</option>
                            }
                          </optgroup>
                        }
                      </select>
                    </div>

                    <div class="flex gap-2">
                      <div class="flex-1">
                        <label class="text-[11px] text-text-muted mb-1">W</label>
                        <input type="number" min="16" max="2000"
                               [ngModel]="widgetWidth()" (ngModelChange)="setWidth($event)"
                               class="h-8 text-xs px-3 py-0" />
                      </div>
                      <div class="flex-1">
                        <label class="text-[11px] text-text-muted mb-1">H</label>
                        <input type="number" min="16" max="2000"
                               [ngModel]="widgetHeight()" (ngModelChange)="setHeight($event)"
                               class="h-8 text-xs px-3 py-0" />
                      </div>
                    </div>

                    <label class="flex items-center gap-2 cursor-pointer select-none">
                      <button (click)="toggleAspectRatio()"
                              class="w-7 h-7 rounded-lg border border-border flex items-center justify-center transition hover:border-accent shrink-0"
                              [class.border-accent]="aspectRatioLocked()">
                        @if (aspectRatioLocked()) {
                          <svg class="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                        } @else {
                          <svg class="w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                        }
                      </button>
                      <span class="text-xs text-text-secondary">Lock aspect ratio</span>
                    </label>

                    <div class="flex items-center gap-3 pt-1">
                      <div class="w-20 h-12 border border-border rounded flex items-center justify-center shrink-0 bg-primary-dark">
                        <div class="bg-accent/20 rounded-[2px] transition-all"
                             [style.width.px]="arIndicatorWidth()"
                             [style.height.px]="arIndicatorHeight()">
                        </div>
                      </div>
                      <span class="text-[11px] text-text-muted font-mono">{{ aspectRatioLabel() }}</span>
                    </div>
                  }

                  <!-- SECTION: Fit Mode -->
                  @if (section.id === 'fit') {
                    <div class="grid grid-cols-2 gap-2">
                      @for (mode of fitModes; track mode.value) {
                        <button (click)="fitMode.set(mode.value)"
                                class="flex flex-col items-center gap-1.5 p-3 rounded-lg border transition text-left hover:border-text-muted"
                                [class.border-accent]="fitMode() === mode.value"
                                [style.background]="fitMode() === mode.value ? 'rgba(0,237,100,0.05)' : undefined">
                          <span class="flex items-center justify-center w-10 h-8 rounded border text-accent font-bold text-lg leading-none"
                                [style.background]="fitMode() === mode.value ? 'rgba(0,237,100,0.1)' : undefined"
                                [style.border-color]="fitMode() === mode.value ? 'var(--pf-accent)' : 'var(--pf-border)'">{{ fitModeIcon(mode.value) }}</span>
                          <span class="text-xs font-medium">{{ mode.label }}</span>
                          <span class="text-xs text-text-muted leading-tight text-center">{{ mode.desc }}</span>
                        </button>
                      }
                    </div>
                  }

                  <!-- SECTION: Background -->
                  @if (section.id === 'bg') {
                    <div class="flex flex-wrap gap-2">
                      @for (swatch of bgSwatches; track swatch.value) {
                        <button (click)="bgColor.set(swatch.value)"
                                class="w-8 h-8 rounded-lg border-2 transition shrink-0"
                                [class.border-accent]="bgColor() === swatch.value"
                                [class.border-border]="bgColor() !== swatch.value"
                                [style.background]="swatch.value === 'transparent'
                                  ? 'repeating-conic-gradient(#1C3D4F 0% 25%, #0E2A38 0% 50%) 50% / 8px 8px'
                                  : swatch.value"
                                [title]="swatch.label">
                        </button>
                      }
                      <label class="relative w-8 h-8 rounded-lg border-2 border-border cursor-pointer overflow-hidden shrink-0 hover:border-accent transition">
                        <input type="color" [ngModel]="bgColor()" (ngModelChange)="bgColor.set($event)"
                               class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <span class="absolute inset-0 flex items-center justify-center text-[16px] text-text-muted">+</span>
                      </label>
                    </div>
                  }

                  <!-- SECTION: Zoom -->
                  @if (section.id === 'zoom') {
                    <div>
                      <input type="range" min="25" max="200" step="25"
                             [ngModel]="zoomLevel()" (ngModelChange)="zoomLevel.set($event)"
                             class="w-full h-1.5 accent-accent appearance-none cursor-pointer rounded-full bg-surface-light"
                             style="background: linear-gradient(to right, var(--pf-accent) 0%, var(--pf-accent) {{ ((zoomLevel()-25)/175)*100 }}%, var(--pf-border) {{ ((zoomLevel()-25)/175)*100 }}%, var(--pf-border) 100%);" />
                      <div class="flex justify-between text-[10px] text-text-muted mt-1 px-0.5">
                        <span>25%</span>
                        <span>100%</span>
                        <span>200%</span>
                      </div>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      @for (step of zoomSteps; track step) {
                        <button (click)="zoomLevel.set(step)"
                                class="px-2.5 py-1 rounded text-xs border transition"
                                [class.bg-accent]="zoomLevel() === step"
                                [class.text-primary-dark]="zoomLevel() === step"
                                [class.font-medium]="zoomLevel() === step"
                                [class.border-accent]="zoomLevel() === step"
                                [class.border-border]="zoomLevel() !== step"
                                [class.text-text-secondary]="zoomLevel() !== step"
                                class="hover:border-accent">
                          {{ step }}%
                        </button>
                      }
                    </div>
                  }

                  <!-- SECTION: Image Info -->
                  @if (section.id === 'info') {
                    <div class="space-y-2 text-xs bg-primary-dark rounded-lg p-3">
                      @if (selectedOutput(); as o) {
                        <div class="flex justify-between gap-2">
                          <span class="text-text-muted">Image</span>
                          <span class="font-medium text-right">{{ o.label }} &mdash; {{ o.width }}x{{ o.height }}</span>
                        </div>
                        @if (o.file_size_display) {
                          <div class="flex justify-between gap-2">
                            <span class="text-text-muted">File size</span>
                            <span class="font-medium">{{ o.file_size_display }}</span>
                          </div>
                        }
                      } @else if (sourceMode() === 'url' && previewUrl()) {
                        <div class="flex justify-between gap-2">
                          <span class="text-text-muted">Source</span>
                          <span class="font-medium text-right truncate max-w-[180px]">Custom URL</span>
                        </div>
                      }
                      <div class="flex justify-between gap-2">
                        <span class="text-text-muted">Widget</span>
                        <span class="font-medium">{{ widgetWidth() }}x{{ widgetHeight() }} px</span>
                      </div>
                      <div class="flex justify-between gap-2">
                        <span class="text-text-muted">Fit mode</span>
                        <span class="font-medium">{{ fitModeLabel() }}</span>
                      </div>
                      @if (scaleFactor(); as sf) {
                        <div class="flex justify-between gap-2">
                          <span class="text-text-muted">Scale ratio</span>
                          <span class="font-medium">{{ sf }}%</span>
                        </div>
                      }
                      @if (aspectRatioMatch(); as arm) {
                        <div class="flex justify-between gap-2">
                          <span class="text-text-muted">Ratio match</span>
                          <span class="font-medium" [class.text-accent]="arm.match" [class.text-yellow-400]="!arm.match">
                            {{ arm.match ? 'Same ratio' : 'Different ratio' }}
                          </span>
                        </div>
                      }
                    </div>
                  }

                </div>
              }
            </div>
          }
        </div>

        <!-- ===== PREVIEW ZONE ===== -->
        <div class="flex-1 flex items-center justify-center overflow-hidden relative"
             [style.background]="'#001E2B'"
             [style.background-image]="'linear-gradient(rgba(28,61,79,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(28,61,79,0.3) 1px, transparent 1px)'"
             [style.background-size]="'40px 40px'">

          <!-- Dimension badge (top-center) -->
          @if (previewUrl()) {
            <div class="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-surface/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-mono border border-border/50 pointer-events-none">
              {{ widgetWidth() }}x{{ widgetHeight() }} px
            </div>
          }

          <!-- Scaled wrapper -->
          <div [style.transform]="'scale(' + zoomLevel() / 100 + ')'"
               [style.transform-origin]="'center center'"
               class="flex items-center justify-center"
               [style.transition]="'transform 0.15s ease'">

            <div #widgetRef
                 class="preview-widget"
                 [style.width.px]="widgetWidth()"
                 [style.height.px]="widgetHeight()"
                 [style.background-color]="bgColor() === 'transparent' ? undefined : bgColor()"
                 [style.background-image]="bgColor() === 'transparent' ? 'repeating-conic-gradient(#1C3D4F 0% 25%, #0E2A38 0% 50%) 50% / 16px 16px' : undefined">

              @if (previewUrl(); as url) {
                @if (imageLoading()) {
                  <div class="skeleton-shimmer absolute inset-0 rounded-[2px]"></div>
                }
                <img [src]="url" [alt]="selectedOutput()?.label || 'Preview'"
                     class="w-full h-full"
                     [class.opacity-0]="imageLoading()"
                     [style.transition]="'opacity 0.15s ease'"
                     [style.object-fit]="fitMode()"
                     style="object-position: center;"
                     (load)="onImgLoad()"
                     (error)="onImgError()" />
                @if (imageError()) {
                  <div class="absolute inset-0 flex flex-col items-center justify-center bg-primary-dark/80 rounded-[2px]">
                    <svg class="w-10 h-10 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <p class="text-xs text-text-muted">Image could not be loaded</p>
                  </div>
                }

                <!-- Fit mode badge (bottom-left, inside widget) -->
                <div class="absolute bottom-2 left-2 z-10 bg-surface/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono border border-border/50 flex items-center gap-1.5 pointer-events-none">
                  @if (fitMode() === 'cover') {
                    <svg class="w-3 h-3 text-accent" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1" class="stroke-accent" stroke-width="1"/><rect x="0.5" y="0.5" width="11" height="11" rx="1.2" class="fill-accent/20 stroke-accent" stroke-width="1"/></svg>
                  } @else if (fitMode() === 'contain') {
                    <svg class="w-3 h-3 text-accent" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1" class="stroke-current text-text-muted" stroke-width="0.8"/><rect x="2" y="2" width="8" height="8" rx="0.5" class="fill-accent/20 stroke-accent" stroke-width="0.8"/></svg>
                  } @else if (fitMode() === 'fill') {
                    <svg class="w-3 h-3 text-accent" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1" class="fill-accent/20 stroke-accent" stroke-width="0.8"/></svg>
                  } @else {
                    <svg class="w-3 h-3 text-accent" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1" class="stroke-current text-text-muted" stroke-width="0.8"/><rect x="3" y="2" width="5" height="4" rx="0.5" class="fill-accent/20 stroke-accent" stroke-width="0.8"/></svg>
                  }
                  <span class="text-text-secondary">{{ fitModeLabel() }}</span>
                </div>
              } @else {
                <div class="flex flex-col items-center justify-center w-full h-full p-6">
                  <svg class="w-14 h-14 text-accent/40 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <p class="text-sm text-text-muted text-center">Select an image and output from the top bar</p>
                  <p class="text-xs text-text-muted/60 mt-1">or paste an image URL to begin</p>
                </div>
              }

              <!-- Resize drag handle indicator -->
              <div class="absolute bottom-1 right-1 w-4 h-4 pointer-events-none opacity-40" title="Drag to resize">
                <svg class="w-4 h-4 text-accent" viewBox="0 0 16 16" fill="none">
                  <path d="M10 14l4-4M8 14l4-4M10 12l4-4M12 14l4-4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                  <path d="M14 10l-4 4M14 8l-4 4M12 10l-4 4M14 12l-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- FAB for mobile controls -->
          <button (click)="showMobileControls.set(true)"
                  class="lg:hidden absolute bottom-5 right-5 z-30 w-12 h-12 rounded-full bg-accent shadow-lg flex items-center justify-center text-primary-dark hover:bg-accent-hover transition">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
          </button>

          <!-- Mobile controls drawer -->
          @if (showMobileControls()) {
            <div class="lg:hidden fixed inset-0 z-50">
              <div class="absolute inset-0 bg-black/60" (click)="showMobileControls.set(false)"></div>
              <div class="absolute bottom-0 left-0 right-0 bg-surface rounded-t-xl max-h-[70vh] overflow-y-auto shadow-2xl">
                <div class="sticky top-0 bg-surface border-b border-border flex items-center justify-between px-5 py-3 rounded-t-xl">
                  <span class="text-sm font-medium">Controls</span>
                  <button (click)="showMobileControls.set(false)" class="text-text-muted hover:text-text-primary text-lg leading-none">&times;</button>
                </div>
                <div class="p-5 space-y-5">
                  <!-- Mobile: Image Source -->
                  <div>
                    <label class="text-xs text-text-secondary font-medium mb-2 block">Image Source</label>
                    <div class="flex gap-2 mb-2">
                      <button (click)="sourceMode.set('jobs')"
                              class="flex-1 px-3 py-2 rounded-lg text-xs transition"
                              [class.bg-accent]="sourceMode() === 'jobs'"
                              [class.text-primary-dark]="sourceMode() === 'jobs'"
                              [class.font-medium]="sourceMode() === 'jobs'"
                              [class.bg-surface-light]="sourceMode() !== 'jobs'"
                              [class.text-text-secondary]="sourceMode() !== 'jobs'">
                        My Images
                      </button>
                      <button (click)="sourceMode.set('url')"
                              class="flex-1 px-3 py-2 rounded-lg text-xs transition"
                              [class.bg-accent]="sourceMode() === 'url'"
                              [class.text-primary-dark]="sourceMode() === 'url'"
                              [class.font-medium]="sourceMode() === 'url'"
                              [class.bg-surface-light]="sourceMode() !== 'url'"
                              [class.text-text-secondary]="sourceMode() !== 'url'">
                        Image URL
                      </button>
                    </div>
                    @if (sourceMode() === 'jobs') {
                      <mat-select [ngModel]="selectedJobId()" (ngModelChange)="onJobSelect($event)"
                                  class="image-select w-full mb-1.5"
                                  panelClass="image-select-panel">
                        <mat-select-trigger>
                          @if (selectedJobFromList(); as job) {
                            <div class="selected-trigger">
                              <img [src]="job.thumbnail_url" class="trigger-thumb"
                                   (error)="onThumbError($event)" />
                              <span class="trigger-name">{{ job.original_filename }}</span>
                            </div>
                          } @else {
                            <span class="trigger-placeholder">Select an image</span>
                          }
                        </mat-select-trigger>
                        @for (job of doneJobs(); track job.id) {
                          <mat-option [value]="job.id" class="image-option">
                            <div class="image-option__row">
                              <img [src]="job.thumbnail_url" class="image-option__thumb"
                                   (error)="onThumbError($event)" />
                              <div class="image-option__text">
                                <span>{{ job.original_filename }}</span>
                                <span class="text-[10px] text-text-muted">{{ job.original_width }} × {{ job.original_height }}</span>
                              </div>
                            </div>
                          </mat-option>
                        }
                      </mat-select>
                      @if (jobOutputs().length > 0) {
                        <mat-select [ngModel]="selectedOutputId()" (ngModelChange)="onOutputSelect($event)"
                                    class="size-select w-full"
                                    panelClass="size-select-panel">
                          <mat-select-trigger>
                            @if (selectedOutput(); as out) {
                              <div class="selected-trigger">
                                <img [src]="out.output_url" class="trigger-thumb"
                                     (error)="onThumbError($event)" />
                                <span class="trigger-name">{{ out.label }}</span>
                              </div>
                            } @else {
                              <span class="trigger-placeholder">Select a size variant</span>
                            }
                          </mat-select-trigger>
                          @for (output of jobOutputs(); track output.id) {
                            <mat-option [value]="output.id" class="size-option">
                              <div class="size-option__row">
                                <img [src]="output.output_url" class="size-option__thumb"
                                     (error)="onThumbError($event)" />
                                <span>{{ output.label }}</span>
                              </div>
                            </mat-option>
                          }
                        </mat-select>
                      }
                    } @else {
                      <input type="url" placeholder="Paste image URL..."
                             [ngModel]="customImageUrl()" (ngModelChange)="onUrlChange($event)"
                             class="h-8 text-xs px-3 py-0" />
                    }
                  </div>

                  <!-- Mobile: Widget Size -->
                  <div>
                    <label class="text-xs text-text-secondary font-medium mb-2 block">Widget Size</label>
                    <div class="flex gap-2 mb-2">
                      <input type="number" min="16" max="2000"
                             [ngModel]="widgetWidth()" (ngModelChange)="setWidth($event)"
                             placeholder="W" class="h-8 text-xs px-3 py-0 flex-1" />
                      <input type="number" min="16" max="2000"
                             [ngModel]="widgetHeight()" (ngModelChange)="setHeight($event)"
                             placeholder="H" class="h-8 text-xs px-3 py-0 flex-1" />
                    </div>
                    <label class="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                      <input type="checkbox" [ngModel]="aspectRatioLocked()" (ngModelChange)="toggleAspectRatio()"
                             class="accent-accent" />
                      Lock aspect ratio
                    </label>
                  </div>

                  <!-- Mobile: Fit Mode -->
                  <div>
                    <label class="text-xs text-text-secondary font-medium mb-2 block">Fit Mode</label>
                    <div class="flex flex-wrap gap-1.5">
                      @for (mode of fitModes; track mode.value) {
                        <button (click)="fitMode.set(mode.value)"
                                class="px-3 py-1.5 rounded-lg text-xs border transition"
                                [class.bg-accent]="fitMode() === mode.value"
                                [class.text-primary-dark]="fitMode() === mode.value"
                                [class.font-medium]="fitMode() === mode.value"
                                [class.border-accent]="fitMode() === mode.value"
                                [class.border-border]="fitMode() !== mode.value"
                                [class.text-text-secondary]="fitMode() !== mode.value">
                          {{ mode.label }}
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Mobile: Background -->
                  <div>
                    <label class="text-xs text-text-secondary font-medium mb-2 block">Background</label>
                    <div class="flex flex-wrap gap-2">
                      @for (swatch of bgSwatches; track swatch.value) {
                        <button (click)="bgColor.set(swatch.value)"
                                class="w-7 h-7 rounded-lg border-2 transition shrink-0"
                                [class.border-accent]="bgColor() === swatch.value"
                                [class.border-border]="bgColor() !== swatch.value"
                                [style.background]="swatch.value === 'transparent'
                                  ? 'repeating-conic-gradient(#1C3D4F 0% 25%, #0E2A38 0% 50%) 50% / 8px 8px'
                                  : swatch.value">
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Mobile: Zoom -->
                  <div>
                    <label class="text-xs text-text-secondary font-medium mb-2 block">Zoom</label>
                    <input type="range" min="25" max="200" step="25"
                           [ngModel]="zoomLevel()" (ngModelChange)="zoomLevel.set($event)"
                           class="w-full accent-accent" />
                    <div class="flex justify-between text-[10px] text-text-muted mt-1">
                      <span>25%</span>
                      <span>100%</span>
                      <span>200%</span>
                    </div>
                  </div>

                  <!-- Mobile: Reset -->
                  <button (click)="resetAll()" class="w-full py-2 text-xs text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition">
                    Reset All Settings
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class PreviewTesterComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild("widgetRef") widgetRef!: ElementRef<HTMLElement>;

  protected readonly Math = Math;
  protected readonly presetGroups = PRESET_GROUPS;
  protected readonly zoomSteps = ZOOM_STEPS;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private imageService = inject(ImageService);

  readonly fitModes = [
    { value: "cover", label: "Cover", desc: "Fill and crop to fit" },
    { value: "contain", label: "Contain", desc: "Fit inside with letterbox" },
    { value: "fill", label: "Fill", desc: "Stretch to fill" },
    { value: "none", label: "None", desc: "Original size, may overflow" },
  ] as const;

  readonly bgSwatches = [
    { label: "Transparent", value: "transparent" },
    { label: "White", value: "#FFFFFF" },
    { label: "Light Grey", value: "#F5F5F5" },
    { label: "Dark Grey", value: "#1C1C1C" },
    { label: "Black", value: "#000000" },
  ];

  readonly accordionSections: {
    id: string;
    label: string;
    summary: () => string | null;
  }[] = [];

  // UI state
  readonly openSections = signal<Set<string>>(new Set(["size", "fit"]));
  readonly imageLoading = signal(false);
  readonly imageError = signal(false);
  readonly showMobileControls = signal(false);

  // Image Source
  readonly sourceMode = signal<"jobs" | "url">("jobs");
  readonly selectedJobId = signal("");
  readonly selectedOutputId = signal("");
  readonly selectedJob = signal<ResizeJob | null>(null);
  readonly selectedOutput = signal<ResizeOutput | null>(null);
  readonly customImageUrl = signal("");
  readonly doneJobs = signal<ResizeJob[]>([]);
  readonly jobOutputs = signal<ResizeOutput[]>([]);

  // Widget
  readonly widgetWidth = signal(400);
  readonly widgetHeight = signal(300);
  readonly aspectRatioLocked = signal(false);
  readonly lockedRatio = signal<number | null>(null);
  readonly selectedPreset = signal("");

  // Display
  readonly fitMode = signal<"cover" | "contain" | "fill" | "none">("cover");
  readonly bgColor = signal("transparent");
  readonly zoomLevel = signal(100);

  private resizeObserver: ResizeObserver | null = null;

  readonly selectedJobFromList = computed(() => {
    return this.doneJobs().find(j => j.id === this.selectedJobId()) || null;
  });

  readonly previewUrl = computed(() => {
    if (this.sourceMode() === "url") {
      return this.customImageUrl() || null;
    }
    return this.selectedOutput()?.output_url || null;
  });

  readonly fitModeLabel = computed(() => {
    const m = this.fitModes.find(f => f.value === this.fitMode());
    return m ? m.label : this.fitMode();
  });

  readonly aspectRatioLabel = computed(() => {
    const w = this.widgetWidth();
    const h = this.widgetHeight();
    const gcdVal = gcd(w, h);
    return `${w / gcdVal} : ${h / gcdVal}`;
  });

  readonly arIndicatorWidth = computed(() => {
    const w = this.widgetWidth();
    const h = this.widgetHeight();
    const maxW = 80;
    const maxH = 48;
    const ratio = w / h;
    if (ratio > maxW / maxH) return maxW;
    return Math.round(maxH * ratio);
  });

  readonly arIndicatorHeight = computed(() => {
    const w = this.widgetWidth();
    const h = this.widgetHeight();
    const maxW = 80;
    const maxH = 48;
    const ratio = w / h;
    if (ratio > maxW / maxH) return Math.round(maxW / ratio);
    return maxH;
  });

  readonly scaleFactor = computed(() => {
    const out = this.selectedOutput();
    if (!out?.width || !out?.height) return null;
    const wRatio = this.widgetWidth() / out.width;
    const hRatio = this.widgetHeight() / out.height;
    const scale = Math.min(wRatio, hRatio);
    return Math.round(scale * 100);
  });

  readonly aspectRatioMatch = computed(() => {
    const out = this.selectedOutput();
    if (!out?.width || !out?.height) return null;
    const imgRatio = out.width / out.height;
    const widgetRatio = this.widgetWidth() / this.widgetHeight();
    const diff = Math.abs(imgRatio - widgetRatio);
    return { match: diff < 0.01, imgRatio, widgetRatio };
  });

  constructor() {
    this.accordionSections = [
      { id: "size", label: "Widget Size", summary: () => `${this.widgetWidth()}x${this.widgetHeight()} px` },
      { id: "fit", label: "Fit Mode", summary: () => this.fitModeLabel() },
      { id: "bg", label: "Background", summary: () => null },
      { id: "zoom", label: "Zoom", summary: () => `${this.zoomLevel()}%` },
      { id: "info", label: "Image Info", summary: () => null },
    ];
  }

  ngOnInit(): void {
    this.loadDoneJobs();

    this.route.queryParams.subscribe(params => {
      const jobId = params["jobId"];
      const outputId = params["outputId"];

      if (jobId) {
        this.sourceMode.set("jobs");
        this.imageService.getJob(jobId).subscribe(res => {
          if (res.success) {
            this.selectedJob.set(res.data);
            this.selectedJobId.set(jobId);
            this.jobOutputs.set(res.data.outputs || []);
            if (outputId && res.data.outputs) {
              const out = res.data.outputs.find(o => o.id === outputId);
              if (out) {
                this.selectedOutput.set(out);
                this.selectedOutputId.set(outputId);
              }
            }
          }
        });
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.widgetRef) return;

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        let width: number;
        let height: number;

        if (entry.borderBoxSize?.[0]) {
          width = entry.borderBoxSize[0].inlineSize;
          height = entry.borderBoxSize[0].blockSize;
        } else {
          width = entry.contentRect.width + 4;
          height = entry.contentRect.height + 4;
        }

        if (Math.abs(width - this.widgetWidth()) > 0.5) {
          this.widgetWidth.set(Math.round(width));
          this.selectedPreset.set("");
        }
        if (Math.abs(height - this.widgetHeight()) > 0.5) {
          this.widgetHeight.set(Math.round(height));
          this.selectedPreset.set("");
        }
      }
    });
    this.resizeObserver.observe(this.widgetRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  @HostListener("document:keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") return;

    switch (event.key) {
      case "[":
        event.preventDefault();
        this.zoomLevel.set(Math.max(25, this.zoomLevel() - 25));
        break;
      case "]":
        event.preventDefault();
        this.zoomLevel.set(Math.min(200, this.zoomLevel() + 25));
        break;
      case "f":
      case "F":
        event.preventDefault();
        this.cycleFitMode();
        break;
      case "r":
      case "R":
        event.preventDefault();
        this.resetAll();
        break;
      default:
        const n = parseInt(event.key);
        if (n >= 1 && n <= 9) {
          const flatPresets = this.presetGroups.flatMap(g => g.items);
          if (n <= flatPresets.length) {
            event.preventDefault();
            const p = flatPresets[n - 1];
            this.onPresetSelect(p.label);
          }
        }
        break;
    }
  }

  private cycleFitMode(): void {
    const modes: ("cover" | "contain" | "fill" | "none")[] = ["cover", "contain", "fill", "none"];
    const idx = modes.indexOf(this.fitMode());
    this.fitMode.set(modes[(idx + 1) % modes.length]);
  }

  toggleSection(id: string): void {
    this.openSections.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  navigateToResize(): void {
    this.router.navigate(["/app/resize"]);
  }

  private loadDoneJobs(): void {
    this.imageService.getJobs({ status: "DONE", page_size: 50 }).subscribe(res => {
      if (res.success) {
        this.doneJobs.set(res.data.results);
      }
    });
  }

  onJobSelect(jobId: string): void {
    this.selectedJobId.set(jobId);
    this.selectedOutput.set(null);
    this.selectedOutputId.set("");
    this.jobOutputs.set([]);

    if (!jobId) {
      this.selectedJob.set(null);
      return;
    }

    this.imageService.getJob(jobId).subscribe(res => {
      if (res.success) {
        this.selectedJob.set(res.data);
        this.jobOutputs.set(res.data.outputs || []);
      }
    });
  }

  onOutputSelect(outputId: string): void {
    this.selectedOutputId.set(outputId);
    const out = this.jobOutputs().find(o => o.id === outputId) || null;
    this.selectedOutput.set(out);
    this.imageLoading.set(true);
    this.imageError.set(false);
  }

  onUrlChange(url: string): void {
    this.customImageUrl.set(url);
    this.selectedOutput.set(null);
    this.selectedOutputId.set("");
    if (url) {
      this.imageLoading.set(true);
      this.imageError.set(false);
    }
  }

  clearUrl(): void {
    this.customImageUrl.set("");
    this.imageLoading.set(false);
    this.imageError.set(false);
  }

  onPresetSelect(label: string): void {
    this.selectedPreset.set(label);
    for (const group of this.presetGroups) {
      const item = group.items.find(i => i.label === label);
      if (item) {
        const prev = this.aspectRatioLocked() ? this.lockedRatio() : null;
        this.widgetWidth.set(item.width);
        this.widgetHeight.set(item.height);
        if (this.aspectRatioLocked()) {
          this.lockedRatio.set(item.width / item.height);
        }
        return;
      }
    }
  }

  setWidth(value: number): void {
    const v = Math.max(16, Math.min(2000, Math.round(value)));
    this.selectedPreset.set("");
    this.widgetWidth.set(v);
    if (this.aspectRatioLocked() && this.lockedRatio()) {
      this.widgetHeight.set(Math.round(v / this.lockedRatio()!));
    }
  }

  setHeight(value: number): void {
    const v = Math.max(16, Math.min(2000, Math.round(value)));
    this.selectedPreset.set("");
    this.widgetHeight.set(v);
    if (this.aspectRatioLocked() && this.lockedRatio()) {
      this.widgetWidth.set(Math.round(v * this.lockedRatio()!));
    }
  }

  toggleAspectRatio(): void {
    this.aspectRatioLocked.update(v => !v);
    if (this.aspectRatioLocked()) {
      this.lockedRatio.set(this.widgetWidth() / this.widgetHeight());
    } else {
      this.lockedRatio.set(null);
    }
  }

  onImgLoad(): void {
    this.imageLoading.set(false);
    this.imageError.set(false);
  }

  onImgError(): void {
    this.imageLoading.set(false);
    this.imageError.set(true);
  }

  onThumbError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = "none";
  }

  resetAll(): void {
    this.widgetWidth.set(400);
    this.widgetHeight.set(300);
    this.selectedPreset.set("");
    this.fitMode.set("cover");
    this.bgColor.set("transparent");
    this.zoomLevel.set(100);
    this.aspectRatioLocked.set(false);
    this.lockedRatio.set(null);
  }

  async copyPreview(): Promise<void> {
    if (!this.previewUrl()) return;
    const blob = await this.captureWidgetBlob();
    if (blob) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    }
  }

  async downloadPreview(): Promise<void> {
    if (!this.previewUrl()) return;
    const blob = await this.captureWidgetBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pixelforge-preview.png";
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  private async captureWidgetBlob(): Promise<Blob | null> {
    const widget = this.widgetRef?.nativeElement;
    if (!widget) return null;
    const img = widget.querySelector("img");
    if (!img || !img.complete || !img.naturalWidth) return null;

    const canvas = document.createElement("canvas");
    const w = this.widgetWidth();
    const h = this.widgetHeight();
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (this.bgColor() !== "transparent") {
      ctx.fillStyle = this.bgColor();
      ctx.fillRect(0, 0, w, h);
    }

    try {
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;
      let dx: number, dy: number, dw: number, dh: number;

      switch (this.fitMode()) {
        case "cover": {
          const coverScale = Math.max(w / sw, h / sh);
          dw = sw * coverScale;
          dh = sh * coverScale;
          dx = (w - dw) / 2;
          dy = (h - dh) / 2;
          break;
        }
        case "contain": {
          const containScale = Math.min(w / sw, h / sh);
          dw = sw * containScale;
          dh = sh * containScale;
          dx = (w - dw) / 2;
          dy = (h - dh) / 2;
          break;
        }
        case "fill":
          dx = 0; dy = 0; dw = w; dh = h;
          break;
        case "none":
          dx = (w - sw) / 2;
          dy = (h - sh) / 2;
          dw = sw; dh = sh;
          break;
      }

      ctx.drawImage(img, dx!, dy!, dw!, dh!);
    } catch {
      return null;
    }

    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), "image/png");
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  fitModeIcon(value: string): string {
    switch (value) {
      case "cover": return "\u25A0";
      case "contain": return "\u25A1";
      case "fill": return "\u25AE";
      case "none": return "\u25CB";
      default: return "\u25CB";
    }
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
