import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  orderDeliveryFields,
  resolveCheckoutDelivery,
} from "./checkoutDelivery";

const base = {
  buyerPhone: "+2348012345678",
  deliveryName: "Ada Buyer",
};

describe("resolveCheckoutDelivery", () => {
  it("requires street + city for delivery", () => {
    const r = resolveCheckoutDelivery(
      { ...base, fulfillmentMethod: "delivery", deliveryAddress: "12 Road" },
      { fulfillmentMethod: "delivery" }
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /city/i);
  });

  it("accepts a full delivery block", () => {
    const r = resolveCheckoutDelivery(
      {
        ...base,
        fulfillmentMethod: "delivery",
        deliveryAddress: "12 Road",
        deliveryCity: "Lagos",
        deliveryState: "LA",
        deliveryCountry: "ng",
        deliveryNote: "Call first",
      },
      { fulfillmentMethod: "delivery" }
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const fields = orderDeliveryFields(r.delivery);
    assert.equal(fields.deliveryCountry, "NG");
    assert.equal(fields.deliveryCity, "Lagos");
    assert.equal(fields.deliveryNote, "Call first");
  });

  it("rejects pickup when shop does not offer it", () => {
    const r = resolveCheckoutDelivery(
      { ...base, fulfillmentMethod: "pickup" },
      { fulfillmentMethod: "delivery" }
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /pickup/i);
  });

  it("allows pickup without street address when shop offers pickup", () => {
    const r = resolveCheckoutDelivery(
      { ...base, fulfillmentMethod: "pickup" },
      { fulfillmentMethod: "pickup" }
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const fields = orderDeliveryFields(r.delivery);
    assert.equal(fields.fulfillmentMethod, "pickup");
    assert.equal(fields.deliveryAddress, null);
    assert.equal(fields.deliveryCity, null);
  });
});
