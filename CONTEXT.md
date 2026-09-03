# OurPantry Domain

OurPantry helps a household remember what it buys, prepare the next shop, and coordinate shopping without requiring an exact pantry inventory.

## Grocery memory

**Household product**:
A grocery identity that OurPantry remembers for one household across shopping cycles.
_Avoid_: Pantry item, inventory item

**Purchase observation**:
Evidence that a household product was picked up in one completed shopping session. Multiple matching list lines in the same session are one observation.
_Avoid_: Stock count, consumption event

**Learning product**:
A household product observed in shopping history but not yet approved for restock reminders.
_Avoid_: Automatically tracked product

**Tracked product**:
A household product the household has explicitly approved for restock review and reminders.
_Avoid_: Observed product, inventory item

**Paused product**:
A remembered household product excluded from restock review until a household member resumes it.
_Avoid_: Deleted product

**Possible regular**:
A learning product supported by at least two distinct purchase observations and ready for household review.
_Avoid_: Confirmed regular

