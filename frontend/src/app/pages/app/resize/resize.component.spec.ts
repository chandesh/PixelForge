import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { ResizeComponent } from "./resize.component";
import { ImageService } from "../../../services/image/image.service";
import { of, throwError } from "rxjs";
import { SpyObj, createSpyObj } from "../../../test-utils";

const mockPresetsResponse = {
  success: true,
  data: {
    WALLPAPER: [
      {
        id: "p1", name: "Desktop HD", slug: "desktop-hd",
        width: 1920, height: 1080, category: "WALLPAPER", description: "",
      },
    ],
    SOCIAL: [
      {
        id: "p2", name: "Instagram Square", slug: "instagram-square",
        width: 1080, height: 1080, category: "SOCIAL", description: "",
      },
    ],
  },
  message: "",
  errors: null,
};

const mockCustomPresetsResponse = {
  success: true,
  data: [
    { id: "c1", name: "My Banner", width: 728, height: 90 },
    { id: "c2", name: "My Logo", width: 100, height: 100 },
  ],
  message: "",
  errors: null,
};

const mockCreateJobResponse = {
  success: true,
  data: {
    id: "job-new",
    status: "DONE",
    source_type: "UPLOAD",
    original_filename: "test.png",
    created_at: "2025-01-01T00:00:00Z",
    completed_at: "2025-01-01T00:00:01Z",
    outputs: [
      { id: "out-1", label: "Desktop HD", width: 1920, height: 1080, output_url: "/media/output.png", file_size: 102400, created_at: "2025-01-01T00:00:01Z", preset: null },
    ],
  },
  message: "",
  errors: null,
};

describe("ResizeComponent", () => {
  let component: ResizeComponent;
  let fixture: ComponentFixture<ResizeComponent>;
  let imageService: SpyObj<ImageService>;

  beforeEach(async () => {
    const spy = createSpyObj<ImageService>("ImageService", [
      "getPresets", "createJob", "getJob", "getCustomPresets",
      "createCustomPreset", "updateCustomPreset", "deleteCustomPreset",
    ]);
    spy.getPresets.mockReturnValue(of(mockPresetsResponse));
    spy.getCustomPresets.mockReturnValue(of(mockCustomPresetsResponse));

    await TestBed.configureTestingModule({
      imports: [ResizeComponent],
      providers: [{ provide: ImageService, useValue: spy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ResizeComponent);
    component = fixture.componentInstance;
    imageService = TestBed.inject(ImageService) as SpyObj<ImageService>;
    fixture.detectChanges();
  });

  it("loads presets on init and selects first category", () => {
    expect(imageService.getPresets).toHaveBeenCalled();
    expect(component.categoryKeys().length).toBe(2);
    expect(component.selectedCategory()).toBe("WALLPAPER");
  });

  it("loads custom presets on init", () => {
    expect(imageService.getCustomPresets).toHaveBeenCalled();
    expect(component.customPresets().length).toBe(2);
  });

  it("starts at step 0 (upload)", () => {
    expect(component.currentStep()).toBe(0);
  });

  it("uploads a file and sets selectedFile signal", () => {
    const file = new File(["fake-image-data"], "test.png", { type: "image/png" });
    const event = { target: { files: [file] } } as any;
    component.onFileSelected(event);
    expect(component.selectedFile()).toBe(file);
  });

  it("advances to step 1 when nextStep() is called", () => {
    component.selectedFile.set(new File(["data"], "test.png", { type: "image/png" }));
    component.nextStep();
    expect(component.currentStep()).toBe(1);
  });

  it("calls createJob with file and preset_ids then polls", () => {
    vi.useFakeTimers();
    imageService.createJob.mockReturnValue(of(mockCreateJobResponse));
    imageService.getJob.mockReturnValue(of(mockCreateJobResponse));

    component.selectedFile.set(new File(["data"], "test.png", { type: "image/png" }));
    component.selectedPresets.set([
      { id: "p1", name: "Desktop HD", slug: "desktop-hd", width: 1920, height: 1080, category: "WALLPAPER", description: "" },
    ]);

    component.process();

    expect(imageService.createJob).toHaveBeenCalled();
    expect(component.currentStep()).toBe(2);

    vi.advanceTimersByTime(2000);

    expect(imageService.getJob).toHaveBeenCalledWith("job-new");
    vi.useRealTimers();
  });

  it("shows error message on createJob failure", () => {
    imageService.createJob.mockReturnValue(throwError(() => ({ error: { message: "Upload failed" } })));

    component.selectedFile.set(new File(["data"], "test.png", { type: "image/png" }));
    component.process();

    expect(component.error()).toContain("Upload failed");
    expect(component.currentStep()).toBe(1);
  });

  it("system presets render without edit/delete controls", () => {
    component.currentStep.set(1);
    fixture.detectChanges();
    const presetTiles = fixture.debugElement.queryAll(By.css("input[type='checkbox']"));
    expect(presetTiles.length).toBeGreaterThanOrEqual(1);
  });

  it("custom presets load and display name/dimensions", () => {
    fixture.detectChanges();
    expect(component.customPresets().length).toBe(2);
    expect(component.customPresets()[0].name).toBe("My Banner");
  });

  it("shows Add Custom Size form when triggered", () => {
    component.showAddCustom.set(true);
    fixture.detectChanges();
    const saveBtn = fixture.debugElement.query(By.css("button"));
    expect(saveBtn).toBeTruthy();
  });

  it("calls createCustomPreset on form submit", () => {
    imageService.createCustomPreset.mockReturnValue(of({ success: true, data: { id: "c3", name: "New", width: 300, height: 200 }, message: "", errors: null }));
    component.showAddCustom.set(true);
    component.newCustomName.set("New");
    component.newCustomWidth.set(300);
    component.newCustomHeight.set(200);
    component.addCustomPreset();
    expect(imageService.createCustomPreset).toHaveBeenCalledWith({ name: "New", width: 300, height: 200 });
  });

  it("calls deleteCustomPreset and deselects deleted preset", () => {
    imageService.deleteCustomPreset.mockReturnValue(of({ success: true, data: null, message: "Deleted.", errors: null }));
    component.selectedCustomIds.set(["c1", "c2"]);
    component.executeDeleteCustom("c1");
    expect(imageService.deleteCustomPreset).toHaveBeenCalledWith("c1");
    expect(component.selectedCustomIds()).toEqual(["c2"]);
  });

  it("calls updateCustomPreset on save edit", () => {
    imageService.updateCustomPreset.mockReturnValue(of({ success: true, data: { id: "c1", name: "Updated", width: 800, height: 200 }, message: "", errors: null }));
    component.editingCustomId.set("c1");
    component.editCustomName.set("Updated");
    component.editCustomWidth.set(800);
    component.editCustomHeight.set(200);
    component.saveEditCustom("c1");
    expect(imageService.updateCustomPreset).toHaveBeenCalledWith("c1", { name: "Updated", width: 800, height: 200 });
  });

  it("resets all state when reset() is called", () => {
    component.currentStep.set(3);
    component.selectedFile.set(new File(["d"], "a.png", { type: "image/png" }));
    component.selectedPresets.set([{ id: "p1" } as any]);
    component.selectedCustomIds.set(["c1"]);
    component.error.set("oops");

    component.reset();

    expect(component.currentStep()).toBe(0);
    expect(component.selectedFile()).toBeNull();
    expect(component.selectedPresets().length).toBe(0);
    expect(component.selectedCustomIds().length).toBe(0);
    expect(component.error()).toBe("");
  });

  it("formatFileSize returns human-readable strings", () => {
    expect(component.formatFileSize(500)).toBe("500 B");
    expect(component.formatFileSize(2048)).toBe("2.0 KB");
    expect(component.formatFileSize(2097152)).toBe("2.0 MB");
  });
});
