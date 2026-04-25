# Prototype Demo Script

Right now, this farmer is on day 30 of a 5,000-bird broiler batch. The past week has been quietly getting worse, and without a system like this, the pattern would be nearly impossible to catch before losses compound.

Let me show you what the prototype does with the same data.

I'll start from the **input page**. This is where the user logs today's flock condition using a small set of daily operational signals.

Today is April 25. I'll enter what the farmer observed this morning: temperature at 34.5 degrees C, feed intake 38 kilograms, water intake 70 liters, and mortality at 11 birds.

For environment, I'll choose sensor above 25 ppm. Ammonia stress has been a recurring problem this week.

Under behaviour, I'll tick all four warning signs observed this morning: water intake changed, abnormal sounds, huddling or panting, and reduced movement.

I'll add a short note: birds are quieter than usual, some are panting, and the feed trays are not clearing normally.

Now I'll save this reading.

Once submitted, the system calculates the flock's current risk level. This brings us to the **Today page**.

The prototype gives a fast summary of today's condition, the risk score, the signal cards, and the score breakdown. What matters here is that the system is not just reacting to raw values. It compares today's readings against the flock's recent baseline, so it is measuring deviation from what is normal for this specific flock. Then it applies a deterministic scoring model across temperature, feed, water, mortality, air quality, and behaviour.

One glance answers the critical question: how risky does today look, and which signals are driving that score?

But a single day does not tell the full story. That is where the **Trends** tab comes in.

Flock problems almost never appear all at once. They build up over days. This is where the prototype becomes genuinely useful.

At the top, I select the analysis window. I can look at the last 3 days, 1 week, or 2 weeks. I'll keep it on 1 week, so April 19 to April 25. Both the graphs and the AI reasoning are tied to exactly this window, so before generating any AI output, we first define the context and look at the actual data.

Let me show the **risk score graph** for that week.

On April 19, the score was already at 58, sitting in the High zone. By April 21 it had climbed to 75. Then on April 22 it hit 83, crossing into Critical.

Here is the interesting part. On April 23, the score dropped back to 79. At first glance that looks like recovery. The farmer had adjusted ventilation and the ammonia reading improved. But look what happened next: April 24 came back up to 84, and today, April 25, we are at 86 and still rising.

That pattern, a partial recovery followed by a worse resurgence, is exactly the kind of thing that is easy to miss day by day but becomes obvious the moment you see the full week in one view.

Now let me switch to the supporting signals.

On feed intake: the flock was eating 45.3 kg on April 19. By April 24 it had dropped to 40.7 kg. Today it is 38 kg. That is a 16% fall in one week with no sign of recovery.

On temperature: April 19 was 32.3 degrees C. Today it is 34.5. Environmental pressure has been steadily building the entire week.

On water intake: same story. 89 litres on April 19, down to 70 litres today, tracking the feed decline almost exactly.

On mortality: 3 birds on April 19. 5 on April 24. 11 today. The acceleration in the last 48 hours is the sharpest signal in this entire dataset.

Together these four lines tell a clear story. Feed and water have been declining for a week, temperature has been rising, mortality is accelerating, and the apparent recovery on April 23 did not hold. This is not a one-day anomaly. Something has been building since at least April 16, and it is getting worse faster now.

Now that we have reviewed the data pattern, I'll click **Generate AI Analysis**.

This opens the AI analysis hub for the April 19 to 25 window.

The first tab is **Overall Assessment**. Instead of just saying risk is critical, this tab explains how the pattern developed: which signals worsened first, when the trajectory shifted, and whether the flock is worsening, stabilizing, or recovering. It turns a week of raw numbers into a readable operational summary.

The second tab is **Disease Probability**. This is one of the most important parts of the prototype.

The system presents likely disease or condition hypotheses with confidence levels and short reasoning. This is not free-form AI guessing. The prototype first runs a deterministic scoring model to establish what is happening in the data, then sends that structured pattern to the AI layer together with retrieved poultry health references. The disease reasoning is RAG-grounded, anchored to veterinary knowledge rather than generated from nothing.

That distinction matters for credibility. A farmer or vet looking at this output can see the signal basis for each hypothesis, not just a probability floating without explanation.

The third tab is **Recommended Actions**. This converts the analysis into a prioritized action list: checking ventilation, verifying the water supply, inspecting weak birds, and escalating to veterinary support if the pattern continues. The farmer does not just need a warning. They need to know what to do before the next check.

The fourth tab is **Impact Comparison**. This is the 7-day projected scenario.

The prototype compares two outcomes side by side: without action, and act now.

Given the current trajectory, without intervention the system projects mortality of 30 to 50 percent, which is 1,500 to 2,500 birds from this 5,000-bird batch. At current broiler market rates of around RM 7 per bird, that translates to losses between RM 10,500 and RM 17,500 over the next 7 days. With early intervention, that range drops to RM 1,750 to 3,500. The farmer is looking at a potential saving of up to RM 14,000 from acting today instead of waiting.

That is the financial stake behind the risk score. The number now means something concrete.

One more detail worth noting: each AI tab has a follow-up question button. If the farmer wants to go deeper on the disease assessment, query a specific action, or understand the projected numbers, they can continue into a chat session with the full context already loaded. The prototype is not a static dashboard. It is an interactive decision-support workflow.

Finally, the **History** tab.

This is the running record of past daily reports. The farmer can scroll back, see the risk score and top driver for each date, and open any day to inspect the full report.

Looking at this flock's history: the first warning signal appeared on April 16, when the score climbed to 31 and the farmer's note mentioned a faint ammonia smell and softer water lines. By April 19 the score had crossed into High. By April 22 it was Critical. The false recovery on April 23 is visible here, and today is the worst reading yet.

A farm manager, veterinarian, or supervisor can look at this trail and understand exactly when the problem started, how fast it progressed, and whether earlier intervention was available. That traceability is what turns a monitoring tool into an accountable management record.

So the full workflow is: the farmer logs today's data, the system scores it against the flock's baseline, the Trends tab shows the pattern across the selected window, AI analysis grounds the interpretation in veterinary knowledge, and History keeps the audit trail.

The entire loop, from daily log to an AI-grounded financial impact estimate, takes under two minutes. That is the workflow we are putting in a farmer's hands.
