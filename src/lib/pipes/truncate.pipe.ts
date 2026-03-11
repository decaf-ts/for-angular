import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  // pure: true,
  standalone: true,
})
export class DecafTruncatePipe implements PipeTransform {
  transform(value: string, limit = 30, trail: string = '...'): string {
    if (!value) {
      return '';
    }
    const sanitized = this.sanitize(value);
    return sanitized.length > limit ? `${sanitized.substring(0, limit)}${trail}` : sanitized;
  }

  sanitize(value: string): string {
    return value.replace(/<[^>]+>/g, '').trim();
  }
}
