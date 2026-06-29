import { Component, OnInit, signal, inject, computed } from "@angular/core";
import { RouterLink } from "@angular/router";
import { FormBuilder, ReactiveFormsModule, FormsModule, FormArray, FormGroup, Validators } from "@angular/forms";
import { ImageService, PresetGroup, Preset, CustomPreset, ResizeJob } from "../../../services/image/image.service";

@Component({
  selector: "pf-resize",
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <div class="page-content">
      <h2 class="text-2xl font-bold mb-8">Resize Image</h2>

      <div class="flex items-center gap-2 mb-8 text-sm">
        @for (step of steps; track step; let i = $index) {
          <div class="flex items-center gap-2">
            <div [class]="'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ' +
              (currentStep() >= i ? 'bg-accent text-primary-dark' : 'bg-surface-light text-text-muted')">
              {{ i + 1 }}
            </div>
            <span [class]="currentStep() >= i ? 'text-text-primary' : 'text-text-muted'">{{ step }}</span>
          </div>
          @if (i < steps.length - 1) {
            <span class="flex-1 h-px bg-border mx-2"></span>
          }
        }
      </div>

      @if (currentStep() === 0) {
        <div class="card space-y-6">
          <h3 class="text-lg font-semibold">Upload or paste a URL</h3>

          <div class="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-accent/50 transition cursor-pointer"
               (click)="fileInput.click()">
            <div class="upload-icon"></div>
            <p class="text-text-secondary mb-2">Drag and drop your image here, or click to browse</p>
            <p class="text-text-muted text-sm">Supports JPG, PNG, WebP</p>
            <input #fileInput type="file" (change)="onFileSelected($event)" accept="image/*" class="hidden" />
          </div>

          @if (selectedFile(); as file) {
            <div class="flex items-center gap-3 p-3 bg-surface-light rounded-lg">
              <span class="check-icon"></span>
              <span class="text-sm">{{ file.name }}</span>
            </div>
          }

          <div class="flex items-center gap-4">
            <hr class="flex-1 border-border" />
            <span class="text-text-muted text-sm">OR</span>
            <hr class="flex-1 border-border" />
          </div>

          <div>
            <label>Image URL</label>
            <input type="url" placeholder="https://example.com/image.jpg" [ngModel]="sourceUrl()" (ngModelChange)="sourceUrl.set($event)" />
          </div>

          <div class="flex justify-end">
            <button class="btn-primary" (click)="nextStep()">Choose Sizes →</button>
          </div>
        </div>
      }

      @if (currentStep() === 1) {
        <div class="card space-y-6">
          <h3 class="text-lg font-semibold">Select output sizes</h3>

          <div>
            <h4 class="text-sm font-medium text-text-secondary mb-3">Standard Sizes</h4>
            <div class="flex gap-2 flex-wrap mb-4">
              @for (cat of categoryKeys(); track cat) {
                <button (click)="selectedCategory.set(cat)"
                        [class]="'px-4 py-2 rounded-lg text-sm transition ' +
                          (selectedCategory() === cat ? 'bg-accent text-primary-dark font-medium' : 'bg-surface-light text-text-secondary hover:text-text-primary')">
                  {{ categoryLabel(cat) }}
                </button>
              }
            </div>

            @if (filteredPresets(); as presets) {
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                @for (preset of presets; track preset.id) {
                  <div (click)="togglePreset(preset)"
                       [class]="'border rounded-lg p-4 cursor-pointer transition ' +
                         (isPresetSelected(preset) ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50')">
                    <div class="aspect-video bg-surface-light rounded mb-2 flex items-center justify-center text-text-muted text-xs">
                      {{ preset.width }}×{{ preset.height }}
                    </div>
                    <div class="flex items-center gap-2">
                      <input type="checkbox" [checked]="isPresetSelected(preset)" class="accent-accent" />
                      <p class="text-sm font-medium">{{ preset.name }}</p>
                    </div>
                    <p class="text-xs text-text-muted mt-1">{{ preset.width }} × {{ preset.height }}</p>
                  </div>
                }
              </div>
            }
          </div>

          <hr class="border-border" />

          <div>
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-medium text-text-secondary">My Custom Sizes</h4>
              <button class="text-sm text-accent hover:underline" (click)="showAddCustom.set(true)">+ Add Custom Size</button>
            </div>

            @if (showAddCustom()) {
              <div class="border border-border rounded-lg p-4 mb-4 space-y-3 bg-surface-light">
                <h5 class="text-sm font-medium">New Custom Size</h5>
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="text-xs">Name</label>
                    <input placeholder="e.g. Banner" [(ngModel)]="newCustomName" class="text-sm" />
                  </div>
                  <div>
                    <label class="text-xs">Width (px)</label>
                    <input type="number" placeholder="W" [(ngModel)]="newCustomWidth" class="text-sm" min="1" />
                  </div>
                  <div>
                    <label class="text-xs">Height (px)</label>
                    <input type="number" placeholder="H" [(ngModel)]="newCustomHeight" class="text-sm" min="1" />
                  </div>
                </div>
                <div class="flex gap-2 justify-end">
                  <button class="btn-secondary text-sm py-1 px-3" (click)="showAddCustom.set(false)">Cancel</button>
                  <button class="btn-primary text-sm py-1 px-3" (click)="addCustomPreset()">Save</button>
                </div>
              </div>
            }

            @if (customPresets().length === 0) {
              <p class="text-xs text-text-muted">No custom sizes yet. Add one above.</p>
            }

            @for (cp of customPresets(); track cp.id) {
              <div class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface-light/50">
                @if (editingCustomId() === cp.id) {
                  <div class="flex-1 flex gap-2 items-center">
                    <input [(ngModel)]="editCustomName" placeholder="Name" class="text-sm flex-1" />
                    <input type="number" [(ngModel)]="editCustomWidth" placeholder="W" class="text-sm w-20" min="1" />
                    <input type="number" [(ngModel)]="editCustomHeight" placeholder="H" class="text-sm w-20" min="1" />
                    <button class="text-accent text-sm hover:underline" (click)="saveEditCustom(cp.id)">Save</button>
                    <button class="text-text-muted text-sm hover:underline" (click)="cancelEditCustom()">Cancel</button>
                  </div>
                } @else {
                  <input type="checkbox" [checked]="isCustomSelected(cp.id)" (change)="toggleCustomPreset(cp.id)" class="accent-accent" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">{{ cp.name }}</p>
                    <p class="text-xs text-text-muted">{{ cp.width }} × {{ cp.height }}</p>
                  </div>
                  <button class="text-text-muted hover:text-accent p-1" (click)="startEditCustom(cp)" title="Edit">✎</button>
                  <button class="text-red-400 hover:text-red-300 p-1" (click)="confirmDeleteCustom(cp)" title="Delete">✕</button>
                }
              </div>
            }
          </div>

          <div class="flex justify-between">
            <button class="btn-secondary" (click)="prevStep()">← Back</button>
            <button class="btn-primary" (click)="process()">Process {{ selectedPresets().length + selectedCustomIds().length }} sizes</button>
          </div>
        </div>
      }

      @if (currentStep() === 2) {
        <div class="card text-center py-12 space-y-4">
          <div class="spinner-icon"></div>
          <h3 class="text-xl font-semibold">Processing...</h3>
          <p class="text-text-secondary">Your images are being resized</p>
          <div class="w-64 h-2 bg-surface-light rounded-full mx-auto overflow-hidden">
            <div class="h-full bg-accent rounded-full animate-pulse" style="width: 60%"></div>
          </div>
        </div>
      }

      @if (currentStep() === 3) {
        <div class="card space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-accent">All done!</h3>
              <p class="text-text-secondary text-sm mt-1">{{ completedJob()?.output_count || 0 }} images processed successfully</p>
            </div>
            <div class="flex items-center gap-3">
              <a [routerLink]="['/app/jobs', completedJob()?.id]" class="btn-secondary text-sm">View Details</a>
              <button class="btn-primary" (click)="reset()">Resize another</button>
            </div>
          </div>

          @if (completedJob()?.outputs?.length) {
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              @for (output of completedJob()!.outputs!; track output.id) {
                <div class="border border-border rounded-lg p-4">
                  <div class="aspect-video bg-surface-light rounded mb-3 overflow-hidden">
                    <img [src]="output.output_url" alt="{{ output.label }}" class="w-full h-full object-contain" />
                  </div>
                  <p class="text-sm font-medium">{{ output.label }}</p>
                  <p class="text-xs text-text-muted mb-2">{{ output.width }}×{{ output.height }}</p>
                  <p class="text-xs text-text-muted mb-3">{{ formatFileSize(output.file_size) }}</p>
                  <a [href]="output.output_url" target="_blank" class="text-accent text-sm hover:underline">Download</a>
                </div>
              }
            </div>
          }
        </div>
      }

      @if (error()) {
        <div class="card border-red-500/30 mt-4">
          <p class="text-red-400">{{ error() }}</p>
        </div>
      }
    </div>
  `,
})
export class ResizeComponent implements OnInit {
  private fb = inject(FormBuilder);
  private imageService = inject(ImageService);

  readonly steps = ["Source", "Sizes", "Process", "Results"];
  readonly currentStep = signal(0);
  readonly selectedFile = signal<File | null>(null);
  readonly sourceUrl = signal("");
  readonly presets = signal<PresetGroup>({});
  readonly categoryKeys = signal<string[]>([]);
  readonly selectedCategory = signal("");
  readonly selectedPresets = signal<Preset[]>([]);
  readonly completedJob = signal<ResizeJob | null>(null);
  readonly error = signal("");

  readonly customPresets = signal<CustomPreset[]>([]);
  readonly selectedCustomIds = signal<string[]>([]);

  readonly showAddCustom = signal(false);
  readonly newCustomName = signal("");
  readonly newCustomWidth = signal<number | null>(null);
  readonly newCustomHeight = signal<number | null>(null);

  readonly editingCustomId = signal<string | null>(null);
  readonly editCustomName = signal("");
  readonly editCustomWidth = signal<number | null>(null);
  readonly editCustomHeight = signal<number | null>(null);

  readonly deleteConfirmId = signal<string | null>(null);

  readonly filteredPresets = computed(() => {
    const cat = this.selectedCategory();
    return cat ? (this.presets()[cat] ?? []) : [];
  });

  private formArray: FormArray = this.fb.array([]);

  ngOnInit(): void {
    this.imageService.getPresets().subscribe((res) => {
      if (res.success) {
        this.presets.set(res.data);
        const keys = Object.keys(res.data);
        this.categoryKeys.set(keys);
        this.selectedCategory.set(keys[0] || "WALLPAPER");
      }
    });
    this.loadCustomPresets();
  }

  private loadCustomPresets(): void {
    this.imageService.getCustomPresets().subscribe((res) => {
      if (res.success) {
        this.customPresets.set(res.data);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile.set(input.files[0]);
    }
  }

  togglePreset(preset: Preset): void {
    this.selectedPresets.update((list) => {
      const idx = list.findIndex((p) => p.id === preset.id);
      if (idx >= 0) {
        return list.filter((p) => p.id !== preset.id);
      }
      return [...list, preset];
    });
  }

  isPresetSelected(preset: Preset): boolean {
    return this.selectedPresets().some((p) => p.id === preset.id);
  }

  toggleCustomPreset(id: string): void {
    this.selectedCustomIds.update((list) => {
      const idx = list.indexOf(id);
      if (idx >= 0) {
        return list.filter((i) => i !== id);
      }
      return [...list, id];
    });
  }

  isCustomSelected(id: string): boolean {
    return this.selectedCustomIds().includes(id);
  }

  addCustomPreset(): void {
    const name = this.newCustomName().trim();
    const width = this.newCustomWidth();
    const height = this.newCustomHeight();
    if (!name || !width || !height || width < 1 || height < 1) {
      this.error.set("Name, width, and height are required (positive values).");
      return;
    }
    this.error.set("");
    this.imageService.createCustomPreset({ name, width, height }).subscribe({
      next: () => {
        this.showAddCustom.set(false);
        this.newCustomName.set("");
        this.newCustomWidth.set(null);
        this.newCustomHeight.set(null);
        this.loadCustomPresets();
      },
      error: (err) => {
        this.error.set(err.error?.message || "Failed to create custom preset.");
      },
    });
  }

  startEditCustom(preset: CustomPreset): void {
    this.editingCustomId.set(preset.id);
    this.editCustomName.set(preset.name);
    this.editCustomWidth.set(preset.width);
    this.editCustomHeight.set(preset.height);
  }

  cancelEditCustom(): void {
    this.editingCustomId.set(null);
  }

  saveEditCustom(id: string): void {
    const name = this.editCustomName().trim();
    const width = this.editCustomWidth();
    const height = this.editCustomHeight();
    if (!name || !width || !height || width < 1 || height < 1) {
      this.error.set("Name, width, and height must be positive values.");
      return;
    }
    this.error.set("");
    this.imageService.updateCustomPreset(id, { name, width, height }).subscribe({
      next: () => {
        this.editingCustomId.set(null);
        this.loadCustomPresets();
      },
      error: (err) => {
        this.error.set(err.error?.message || "Failed to update custom preset.");
      },
    });
  }

  confirmDeleteCustom(preset: CustomPreset): void {
    this.deleteConfirmId.set(preset.id);
  }

  cancelDeleteCustom(): void {
    this.deleteConfirmId.set(null);
  }

  executeDeleteCustom(id: string): void {
    this.imageService.deleteCustomPreset(id).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.selectedCustomIds.update((list) => list.filter((i) => i !== id));
        this.loadCustomPresets();
      },
      error: (err) => {
        this.error.set(err.error?.message || "Failed to delete custom preset.");
      },
    });
  }

  nextStep(): void {
    if (!this.selectedFile() && !this.sourceUrl()) {
      this.error.set("Please select a file or enter a URL.");
      return;
    }
    this.error.set("");
    this.currentStep.set(1);
  }

  prevStep(): void {
    this.currentStep.set(0);
  }

  process(): void {
    this.error.set("");

    const customSizesVal = this.customPresets()
      .filter((cp) => this.selectedCustomIds().includes(cp.id))
      .map((cp) => ({
        label: cp.label || cp.name,
        width: cp.width,
        height: cp.height,
      }));

    const payload = {
      source_type: (this.selectedFile() ? "UPLOAD" : "URL") as "UPLOAD" | "URL",
      source_url: this.sourceUrl(),
      preset_ids: this.selectedPresets().map((p) => p.id),
      custom_sizes: customSizesVal,
    };

    this.currentStep.set(2);

    this.imageService.createJob(payload, this.selectedFile() ?? undefined).subscribe({
      next: (res) => {
        if (res.success) {
          this.pollJob(res.data.id);
        }
      },
      error: (err) => {
        this.error.set(err.error?.message || "Failed to create job.");
        this.currentStep.set(1);
      },
    });
  }

  private pollJob(jobId: string): void {
    const interval = setInterval(() => {
      this.imageService.getJob(jobId).subscribe({
        next: (res) => {
          if (res.success) {
            const job = res.data;
            if (job.status === "DONE") {
              clearInterval(interval);
              this.completedJob.set(job);
              this.currentStep.set(3);
            } else if (job.status === "FAILED") {
              clearInterval(interval);
              this.error.set(job.error_message || "Processing failed.");
              this.currentStep.set(1);
            }
          }
        },
        error: () => {
          clearInterval(interval);
          this.error.set("Failed to check job status.");
          this.currentStep.set(1);
        },
      });
    }, 2000);
  }

  reset(): void {
    this.currentStep.set(0);
    this.selectedFile.set(null);
    this.sourceUrl.set("");
    this.selectedPresets.set([]);
    this.selectedCustomIds.set([]);
    this.completedJob.set(null);
    this.error.set("");
    this.showAddCustom.set(false);
    this.deleteConfirmId.set(null);
    this.editingCustomId.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  categoryLabel(cat: string): string {
    const labels: Record<string, string> = {
      WALLPAPER: "Wallpaper",
      THUMBNAIL: "Thumbnail",
      SOCIAL: "Social",
      LOGO: "Logo",
      ICON: "Icon",
      DOCUMENT: "Document",
      CUSTOM: "Custom",
    };
    return labels[cat] || cat;
  }
}
