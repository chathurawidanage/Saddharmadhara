# Yogi Selection Point System

This document explains the point system and sorting algorithm used to select and prioritize yogis for meditation retreats in **Saddharmadhara**.

---

## Overview

When yogis apply for a retreat, the system ranks them based on a **Total Score** calculated dynamically for each applicant. 

The primary goals of the system are to:
1. Prioritize Reverends and Trust/Saddharma Sena Members.
2. Fairly distribute opportunities among young adults and other age groups.
3. Balance participation between general and silent retreats.
4. Penalize last-minute no-shows and multiple bookings in a single season.
5. Boost chances for yogis with fewer scheduling options (lower flexibility in active applications).

---

## 1. Total Score Formula

The total score for a Yogi is calculated using the following formula:

$$\text{Total Score} = \lfloor (S_{\text{status}} + S_{\text{age}} + S_{\text{participation}} + S_{\text{penalty}}) \times M_{\text{flex}} \rfloor$$

Where:
* **$S_{\text{status}}$**: Status Score
* **$S_{\text{age}}$**: Age Score
* **$S_{\text{participation}}$**: Participation Score
* **$S_{\text{penalty}}$**: Penalty Score (typically a negative value)
* **$M_{\text{flex}}$**: Dynamic Flexibility Multiplier

---

## 2. Score Components

### A. Status Score ($S_{\text{status}}$)
This score is based on the yogi's status or priority group:

| Status / Priority Group | Score ($S_{\text{status}}$) | Description / Notes |
| :--- | :--- | :--- |
| **Reverend** (`MaritalState.REVEREND`) | `+9999` | Assures top priority selection. |
| **Trust Member** / **Trust Member's Family** | `+40` | Priority boost for trust stakeholders. |
| **Ordination Intended** | `+25` | Additional boost if yogi indicated intention to be ordained in the coming 2 years within the last 2 years. |
| **Normal Status** (default) | `0` | Standard applicant. |

---

### B. Age Score ($S_{\text{age}}$)
The age of the yogi is calculated from their Date of Birth (`dob`) relative to the current time:

* **Age 20 to 40 (inclusive)**: 
  $$S_{\text{age}} = 50$$
* **Age 41 to 70 (inclusive)**: 
  $$S_{\text{age}} = 30 + 1.33 \times |55 - \text{age}|$$
  *(Note: This formula creates a V-shape curve centered at 55. A 55-year-old receives the minimum score of `30`, while a 41-year-old receives `~48.6` and a 70-year-old receives `~50`.)*
* **Age under 20, over 70, or Date of Birth not provided**:
  $$S_{\text{age}} = 0$$

---

### C. Participation Score ($S_{\text{participation}}$)
To ensure fair rotation and reward time spent waiting, the system applies a **time-decay quadratic deduction** for attended retreats within the last 2 years (730 days).

For each attended retreat at time $t$ (days elapsed since retreat date):
$$\text{Deduction}(t) = \text{round}\left( -D_{\max} \times \left(1 - \frac{t}{730}\right)^2 \right)$$
where $D_{\max} = 20$ (`MAX_PARTICIPATION_DEDUCTION`).

* Decay trajectory:
  * **Day 0 (Just attended)**: $-20$
  * **3 months (90 days)**: $-15$
  * **6 months (180 days)**: $-11$
  * **1 year (365 days)**: $-5$
  * **1.5 years (550 days)**: $-1$
  * **2 years (730 days)**: $0$

The score starts at a base of `100` and accumulates modifications depending on the **type of the current retreat**:

* **If the current retreat is a General Retreat**:
  $$S_{\text{participation}} = 100 + \sum \text{Deduction}(t_{\text{general}}) + (10 \times N_{\text{silent}})$$
  *Attending General retreats reduces priority with quadratic time decay (max $-20$ per retreat), but attending Silent retreats adds a bonus ($+10$ per attendance).*
* **If the current retreat is a Silent Retreat**:
  $$S_{\text{participation}} = 100 + \sum \text{Deduction}(t_{\text{silent}})$$
  *Attending Silent retreats reduces priority with quadratic time decay (max $-20$ per retreat).*
* **If current retreat type is unspecified**:
  $$S_{\text{participation}} = 100 + \sum \text{Deduction}(t_{\text{general}}) + (10 \times N_{\text{silent}})$$

* **Dhamma Seva Boost**:
  If the yogi has attended at least one **Dhamma Seva** (`dhamma-seva`) retreat within the last 2 years, they receive a boost of `+100` points added to $S_{\text{participation}}$:
  $$\text{Boost} = +100$$

* **First-Time Yogi Boost**:
  If the yogi has never attended any retreat and has never been in `SELECTED` or active `PENDING` state for any other retreat (excluding stale `PENDING` states where the retreat date has already passed), an additional boost is added to $S_{\text{participation}}$:
  $$\text{Boost} = +50$$

---

### D. Penalty Score ($S_{\text{penalty}}$)
The penalty score starts at `0` and accumulates deductions:

1. **No-Show Penalty**:
   If the yogi had a "No-Show" (`AttendanceState.NOSHOW`) on any retreat starting **within the last year (365 days)**:
   $$\text{Deduction} = -25$$

2. **Double/Multiple Bookings in Same Season**:
   Checks other expressions of interest (EOIs) in the same season as the current retreat (excluding the current retreat itself):
   * Count an EOI as a duplicate request if it is in `SELECTED` state, or `PENDING` state (excluding stale pending states where the retreat has already started/ended).
   * Let $C_{\text{season}}$ be the count of these active selected/pending registrations.
   * If $C_{\text{season}} > 0$, the penalty is calculated as:
     $$\text{Deduction} = -25 - 50 \times (C_{\text{season}} - 1)$$
     * Examples:
       * 1 active registration: **$-25$**
       * 2 active registrations: **$-75$**
       * 3 active registrations: **$-125$**

---

### E. Dynamic Flexibility Multiplier ($M_{\text{flex}}$)
This multiplier rewards yogis who have applied to fewer retreats in the current season, giving them a boost on their limited applications. It uses two values:

1. **$S_{\text{total\_active}}$**: The total count of active/upcoming retreats in the current season (excluding past retreats). Defaults to `4` if none are found.
2. **$D_{\text{effective}}$**: The number of upcoming retreats requested by the yogi in the same season that **still have open capacity** for their gender.
   * *A retreat has open capacity if the current selected/pending count for the yogi's gender is less than the gender capacity allocated for that retreat.*

The multiplier is calculated as:
$$M_{\text{flex}} = 1 + 0.1 \times (S_{\text{total\_active}} - D_{\text{effective}})$$

*If no season is defined for the current retreat, $M_{\text{flex}} = 1.0$.*

#### Multiplier Examples:
Assuming a season has 4 active retreats:
* A yogi applies to **all 4** retreats (high flexibility/options):
  $$D_{\text{effective}} = 4 \implies M_{\text{flex}} = 1 + 0.1 \times (4 - 4) = 1.0$$
* A yogi applies to **only 1** retreat (low flexibility/options):
  $$D_{\text{effective}} = 1 \implies M_{\text{flex}} = 1 + 0.1 \times (4 - 1) = 1.3 \quad (30\% \text{ score boost})$$

---

## 3. Sorting & Tie-Breaking Rules

When generating the prioritized list of applicants for a retreat, the system sorts them using the following rules:

1. **Total Score (Descending)**: Applicants with the highest total score are selected first.
2. **Application Time (Ascending - Tie-breaker)**: If two applicants have the exact same total score, the yogi who submitted their expression of interest (EOI) earlier (`occurredAt` timestamp) is given priority.
3. **Alternative Age Sort**:
   Alternatively, administrators can choose to sort by age. In this mode, the system:
   * Sorts by birth date ascending (oldest first).
   * In case of identical birthdays, falls back to the **Total Score** and then the **Application Time** tie-breaker.
