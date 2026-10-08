import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule, TranslateParser } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader, I18nParser } from '../../i18n';
import { FileUploadComponent } from './file-upload.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

describe('FileUploadComponent dropzone', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ForAngularCommonModule,
        FileUploadComponent,
        TranslateModule.forRoot({
          defaultLanguage: 'en',
          loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
          parser: { provide: TranslateParser, useClass: I18nParser },
        }),
      ],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();
    fixture = TestBed.createComponent(FileUploadComponent);
    component = fixture.componentInstance;
    component.name = 'files';
    component.formGroup = new FormGroup({ files: new FormControl(null) });
    component.formControl = component.formGroup.controls['files'] as FormControl;
    component.label = 'Upload documents';
  }));

  it('dropzone keyboard', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const dropzone = fixture.nativeElement.querySelector('.dcf-drop-area') as HTMLElement;
    expect(dropzone.getAttribute('role')).toBe('button');
    expect(dropzone.getAttribute('tabindex')).toBe('0');
    expect(dropzone.getAttribute('aria-label')).toBeTruthy();

    const select = jest.spyOn(component, 'handleClickToSelect').mockResolvedValue();
    for (const key of ['Enter', ' ']) {
      dropzone.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      expect(select).toHaveBeenCalledTimes(key === 'Enter' ? 1 : 2);
    }
    dropzone.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    expect(component.dragging).toBe(true);
    dropzone.dispatchEvent(new Event('dragleave', { bubbles: true, cancelable: true }));
    expect(component.dragging).toBe(false);
  });

  it('decodes html document content for preview', () => {
    const raw = '<p>hello</p>';
    expect(component.decodeDocumentContent(raw)).toBe(raw);

    const encoded = btoa('<p>decoded</p>');
    expect(component.decodeDocumentContent(encoded)).toBe('<p>decoded</p>');
    expect(component.decodeDocumentContent(`data:text/html;base64,${encoded}`)).toBe('<p>decoded</p>');
    expect(component.decodeDocumentContent('')).toBe('');
  });
});
