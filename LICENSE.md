Mozilla Public License Version 2.0

1. Definitions

"Contributor"
    means each individual or legal entity that creates, contributes to the
    creation of, or owns Covered Software.

"Contributor Version"
    means the combination of the Contributions of others (if any) used by a
    Contributor and that particular Contributor's Contribution.

"Covered Software"
    means Source Code Form to which the initial Contributor has attached the
    notice in Exhibit A, the Executable Form of such Source Code Form, and
    Modifications of such Source Code Form.

"Executable Form"
    means any form of the work other than Source Code Form.

"Larger Work"
    means a work which combines Covered Software with other material, in a
    separate file or files, that is not Covered Software.

"License"
    means this document.

"Licensable"
    means having the right to grant, to the maximum extent possible, whether
    at the time of the making or afterwards, any and all of the rights
    conveyed by this License.

"Modifications"
    means any addition to or deletion from the contents of Covered Software
    or any new file that contains Covered Software.

"Patent Claims"
    means any patent claim(s), now owned or hereafter acquired, including
    without limitation, method, process, and apparatus claims, in any patent
    Licensable by grantor.

"Secondary License"
    means either the GNU General Public License, Version 2.0, the GNU Lesser
    General Public License, Version 2.1, the European Union Public License 1.1,
    or any subsequent versions of those licenses that are designated as a
    Secondary License in the notice in Exhibit A.

"Source Code Form"
    means the form of the work preferred for making modifications.

"You" (or "Your")
    means an individual or a legal entity exercising rights under, and
    complying with all of the terms of, this License. For legal entities,
    "You" includes any entity that controls, is controlled by, or is under
    common control with You. For purposes of this definition, "control"
    means (a) the power, direct or indirect, to cause the direction or
    management of such entity, whether by contract or otherwise, or (b)
    ownership of more than fifty percent (50%) of the outstanding shares or
    beneficial ownership of such entity.

2. License Grants and Conditions

Each Contributor hereby grants You a world-wide, royalty-free, non-exclusive
license:

  a. under intellectual property rights (other than patent or trademark)
     Licensable by such Contributor to use, reproduce, make available,
     modify, display, perform, distribute, and otherwise exploit its
     Contributions, either on an exclusive or non-exclusive basis; and

  b. under Patent Claims to make, use, sell, offer for sale, have made,
     import, and otherwise transfer the Contribution(s) of such
     Contributor, if any, in the Covered Software.

This license does not grant rights to any trademarks, service marks, or logos
of any Contributor (except as may be necessary to comply with the notice
requirements in Section 3.4).

3. Distribution Obligations

3.1. Distribution of Source Form

All distribution of Covered Software in Source Code Form, including any
Modifications that You create or to which You contribute, must be under the
terms of this License. You must inform recipients that the Source Code Form
of the Covered Software is governed by the terms of this License and include
a copy of this License in or with the Source Code Form.

3.2. Distribution of Executable Form

If You distribute Covered Software in Executable Form then:

  a. such Covered Software must also be made available in Source Code Form,
     as described in Section 3.1, and You must inform recipients of the
     Executable Form how to obtain a complete copy of the corresponding
     Source Code Form in a reasonable manner on or through a medium
     customarily used for software exchange; and

  b. You may distribute the Executable Form under terms of your choice,
     provided that You do not attempt to limit or alter the recipients'
     rights in the Source Code Form under this License.

3.3. Distribution of a Larger Work

You may create and distribute a work that combines Covered Software with
other material, and distribute the Larger Work as a single product. In such
case, the Covered Software must still be made available under this License
and must include the notices described in Exhibit A relating to the Covered
Software.

3.4. Notices

You must cause each file that You distribute containing Covered Software to
carry the legal notices described in Exhibit A.

4. Incompatible With Secondary Licenses

If the Covered Software is made available under the terms of this License
and also made available under the terms of a Secondary License, then the
terms of the Secondary License apply to the Covered Software in addition to
this License to the extent the Secondary License grants additional
permissions. If the Covered Software is not made available under a Secondary
License, then this License governs its use.

5. Disclaimer of Warranty

Covered Software is provided "as is" without warranty of any kind, either
express or implied, including, but not limited to, the implied warranties of
merchantability, fitness for a particular purpose, and noninfringement.

6. Limitation of Liability

In no event and under no legal theory, whether in tort (including
negligence), contract, or otherwise, unless required by applicable law (such
as deliberate and grossly negligent acts) or agreed to in writing, shall any
Contributor be liable to You for damages, including any direct, indirect,
special, incidental, or consequential damages of any character arising as a
result of this License or out of the use or inability to use the Covered
Software (including but not limited to damages for loss of goodwill, work
stoppage, computer failure or malfunction, or any and all other commercial
damages or losses), even if such Contributor has been advised of the
possibility of such damages.

7. Termination

This License and the rights granted hereunder will terminate automatically
if You fail to comply with terms of this License and do not cure such
breach within thirty (30) days of becoming aware of the breach.

8. Miscellaneous

This License constitutes the entire agreement between the parties with
respect to the subject matter hereof. If any provision of this License is
held to be unenforceable, that provision shall be reformed only to the
extent necessary to make it enforceable. The headings are for convenience
only and do not affect the interpretation.

Exhibit A - Source Code Form License Notice

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.

  Copyright (c) 2025 Tiago Venceslau and Contributors

---

# Decaf‑TS Fair Usage Addendum (MPL‑2.0 baseline — AGPL‑3.0 trigger)

> Placement: This Addendum is intended to be appended to the canonical
> Mozilla Public License v2.0 text distributed with a package (after
> Exhibit A). The MPL‑2.0 text itself remains the baseline license for the
> package sources. This Addendum describes when an alternative licensing
> outcome (AGPL‑3.0) SHALL apply for certain AI‑driven code‑generation uses.

---

## 1. Purpose (normative)

This Addendum SHALL govern the treatment of automated AI generation of
Decaf‑TS source code and related artifacts. The canonical MPL‑2.0 text
REMAINS the governing license for ordinary, human‑authored uses of the
package. This Addendum DOES NOT replace or modify the MPL‑2.0 text other
than by clarifying the licensing outcome for the specific scenarios set
forth below.

## 2. Normative summary (readable obligations)

- The package source is LICENSED under MPL‑2.0 by default.
- Where an automated AI process (as defined below) GENERATES Decaf‑TS
  source code and such generated code is used without meaningful human
  review before production, THEN the generated code and derivative works
  incorporating it SHALL be licensed under AGPL‑3.0.
- Human‑in‑the‑loop development and manual developer acceptance of
  generated artifacts SHALL remain governed by MPL‑2.0.
- Project names, logos, and trademarks ARE NOT licensed by this Addendum.

## 3. Normative definitions

In the context of this Addendum, the following definitions APPLY and are
normative:

- **Decaf MCP**: any official Decaf Model/Code Platform, endpoint,
  integration, or tooling that facilitates the generation of Decaf‑TS
  code via an AI model or automated process.

- **Uses AI generation of Decaf‑TS code**: an activity in which a tool,
  system, pipeline, API, service, or product (including Decaf MCP or any
  custom integration) programmatically produces Decaf‑TS source code,
  component definitions, or UI artifacts without per‑artifact meaningful
  human review and approval prior to production use or distribution.

- **Meaningful human review**: a manual action in which a developer or
  qualified engineer INSPECTS, EDITS, TESTS, and EXPRESSLY APPROVES each
  generated Decaf‑TS artifact prior to its inclusion in production or
  distribution. Automated, cursory, or bulk acceptance DOES NOT satisfy
  this requirement.

- **Non‑deterministic dynamic UI generation**: generation of UI
  components, structures, or component code at runtime or on demand where
  outputs vary and are not fixed/hardcoded artifacts that were authored
  and accepted by a developer.

## 4. Trigger rule — when AGPL‑3.0 SHALL apply (normative)

- IF a person or entity Meets the definition “Uses AI generation of
  Decaf‑TS code”, THEN:
  - The Decaf‑TS code automatically generated by that process MUST be
    treated as subject to the GNU Affero General Public License v3.0
    (AGPL‑3.0); and
  - Any derivative works or distributed products that incorporate that
    generated code and that are distributed, provided as a network service,
    or sold SHALL comply with AGPL‑3.0 obligations for the covered parts.

- The AGPL‑3.0 requirement ATTACHES to the generated Decaf‑TS portions
  and to those portions of a larger work that are covered by AGPL‑3.0; it
  DOES NOT nullify the MPL‑2.0 baseline for the original package sources.

## 5. Exceptions where MPL‑2.0 SHALL remain (normative)

- The following activities DO NOT, in themselves, trigger the AGPL‑3.0
  requirements:
  - Downloading and using pre‑compiled binaries or other forms of
    Executable Form of the Covered Software.
  - Using the Covered Software in a way that does not involve
    "Uses AI generation of Decaf‑TS code" as defined above.
  - Modifying the Source Code Form or contributing to the project in a
    manner that is not automated or AI‑driven.
  - Using AI assistance or code generation tools in a way that does not
    automatically generate Decaf‑TS code or that involves meaningful human
    review and intervention.

- The following conditions MUST be met for the MPL‑2.0 license to remain
  in effect:
  - The Decaf‑TS source code is not part of a larger work that triggers
    AGPL‑3.0 under this Addendum.
  - The Covered Software is not being distributed, provided as a network
    service, or sold in a manner that incorporates or is derived from
    Decaf‑TS code generated by an AI process without meaningful human
    review.
