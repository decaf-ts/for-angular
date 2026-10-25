import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { TranslateService } from "@ngx-translate/core";

import type { AgentChatOrder } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";
import { ChatToolOrdersComponent } from "./chat-tool-orders.component";

class FakeTranslateService {
  readonly dictionary: Record<string, string> = {};

  instant(key: string): string {
    return this.dictionary[key] ?? key;
  }
}

let translate: FakeTranslateService;

const ORDERS: AgentChatOrder[] = [
  {
    id: "ORD-1",
    name: "Studio Monitor Headphones",
    date: "2026-10-02",
    icon: "invoice",
    status: "delayed",
  },
  { id: "ORD-2", name: "Mechanical Keyboard", date: "2026-10-05" },
];

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatToolOrdersComponent> {
  const fixture = TestBed.createComponent(ChatToolOrdersComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatToolOrdersComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function rows(
  fixture: ComponentFixture<ChatToolOrdersComponent>,
): HTMLElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".chat-tool-orders__row"),
  ) as HTMLElement[];
}

describe("ChatToolOrdersComponent", () => {
  beforeEach(() => {
    translate = new FakeTranslateService();
    TestBed.configureTestingModule({
      imports: [ChatToolOrdersComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("falls back to the orders title and exposes it as the aria label", () => {
    const fixture = mount({ orders: ORDERS });

    expect(
      element(fixture).querySelector(".chat-tool-orders")?.getAttribute(
        "aria-label",
      ),
    ).toBe("Orders");
    expect(
      element(fixture).querySelector(".chat-tool-orders__title")?.textContent?.trim(),
    ).toBe("Orders");
    expect(
      element(fixture).querySelector(".chat-tool-orders__title")?.tagName,
    ).toBe("H3");
  });

  it("renders a custom title verbatim", () => {
    const fixture = mount({ orders: ORDERS, title: "Delayed orders" });

    expect(
      element(fixture).querySelector(".chat-tool-orders__title")?.textContent?.trim(),
    ).toBe("Delayed orders");
    expect(
      element(fixture).querySelector(".chat-tool-orders")?.getAttribute(
        "aria-label",
      ),
    ).toBe("Delayed orders");
  });

  it("resolves the title through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.tool.orders.title"] = "Encomendas";
    const fixture = mount({ orders: ORDERS });

    expect(
      element(fixture).querySelector(".chat-tool-orders__title")?.textContent?.trim(),
    ).toBe("Encomendas");
  });

  it("renders the count badge", () => {
    const fixture = mount({ orders: ORDERS });

    expect(
      element(fixture).querySelector(".chat-tool-orders__count")?.textContent?.trim(),
    ).toBe("2");
  });

  it("renders one row per order with name, date, id and optional status", () => {
    const fixture = mount({ orders: ORDERS });
    const items = rows(fixture);

    expect(items).toHaveLength(2);
    expect(
      items[0].querySelector(".chat-tool-orders__name")?.textContent?.trim(),
    ).toBe("Studio Monitor Headphones");
    expect(
      items[0].querySelector(".chat-tool-orders__date")?.textContent?.trim(),
    ).toBe("2026-10-02");
    expect(
      items[0].querySelector("time")?.getAttribute("datetime"),
    ).toBe("2026-10-02");
    expect(
      items[0].querySelector(".chat-tool-orders__status")?.textContent?.trim(),
    ).toBe("delayed");
    expect(
      items[0].querySelector(".chat-tool-orders__id")?.textContent?.trim(),
    ).toBe("ORD-1");
    expect(
      items[1].querySelector(".chat-tool-orders__status"),
    ).toBeNull();
  });

  it("renders a thumbnail image with alt text when an image is provided", () => {
    const fixture = mount({
      orders: [
        {
          id: "ORD-3",
          name: "USB-C Dock",
          imageUrl: "https://example.test/dock.png",
        },
      ],
    });
    const image = element(fixture).querySelector(
      ".chat-tool-orders__image",
    ) as HTMLImageElement;

    expect(image).not.toBeNull();
    expect(image.getAttribute("src")).toBe("https://example.test/dock.png");
    expect(image.getAttribute("alt")).toBe("USB-C Dock");
  });

  it("renders an icon when the order has no image", () => {
    const fixture = mount({ orders: [ORDERS[0]] });
    const icons = fixture.debugElement.queryAll(
      By.directive(ChatIconComponent),
    );

    expect(element(fixture).querySelector(".chat-tool-orders__image")).toBeNull();
    expect(icons.map((icon) => icon.componentInstance.name())).toContain(
      "invoice",
    );
  });

  it("emits the selected order on row click", () => {
    const fixture = mount({ orders: ORDERS });
    const selected: AgentChatOrder[] = [];
    fixture.componentInstance.orderSelect.subscribe((order) =>
      selected.push(order),
    );

    rows(fixture)[1].click();
    fixture.detectChanges();

    expect(selected).toEqual([ORDERS[1]]);
  });

  it("renders the empty state when there are no orders", () => {
    const fixture = mount({ orders: [] });

    expect(
      element(fixture).querySelector(".chat-tool-orders__empty")?.textContent?.trim(),
    ).toBe("No orders found.");
    expect(rows(fixture)).toHaveLength(0);
  });

  it("resolves the empty state through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.tool.orders.empty"] =
      "Nenhuma encomenda encontrada.";
    const fixture = mount({ orders: [] });

    expect(
      element(fixture).querySelector(".chat-tool-orders__empty")?.textContent?.trim(),
    ).toBe("Nenhuma encomenda encontrada.");
  });
});
