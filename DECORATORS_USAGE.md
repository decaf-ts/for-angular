# Angular Decorators Usage

## `@Service()` and `@Repository()` - Decorator Pattern

These decorators register classes with decaf's injection system and mark them as provided in root:

```typescript
import { Service, Repository } from '@decaf-ts/for-angular';

@service()
class MyService extends Service {}

@Repository(Product)
class ProductRepository extends Repository {}
```

## `injectService()` and `injectRepository()` - Function Pattern

Angular's `inject()` function is called directly in property declarations:

```typescript
import { Component } from '@angular/core';
import { injectService, injectRepository } from '@decaf-ts/for-angular';

@Component({ template: '' })
class ProductComponent {
  service = injectService(MyService);
  repo = injectRepository(Product);
}
```

Or with custom keys:

```typescript
class Component {
  service = injectService('CustomServiceKey');
  repo = injectRepository(Product, 'postgres');
}
```

## Comparison: NestJS vs Angular

**NestJS (constructor injection):**
```typescript
@Injectable()
class Controller {
  constructor(
    @Inject('ProductService') private service: MyService,
    @Inject(Metadata.constr(Product)) private repo: ProductRepository
  ) {}
}
```

**Angular (property injection via inject function):**
```typescript
@Component({})
class Component {
  service = injectService(MyService);
  repo = injectRepository(Product);
}
```

The key difference is that Angular's `inject()` function is called **inside** the class body as a property initializer, not as a parameter decorator in the constructor.
