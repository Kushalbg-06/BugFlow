"""
Intelligent Defect Classification

Uses Llama through Groq to suggest:
- Category
- Module/component
- Defect type
- Severity
- Priority
"""

import os
import json

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel
from typing import Literal

load_dotenv()

GROK_API_KEY = os.getenv("GROK_API_KEY")
GROK_MODEL = os.getenv(
    "GROK_MODEL",
    "llama-3.3-70b-versatile"
)
GROK_BASE_URL = os.getenv(
    "GROK_BASE_URL",
    "https://api.groq.com/openai/v1"
)


if not GROK_API_KEY:
    raise RuntimeError(
        "GROK_API_KEY is missing from .env"
    )


client = OpenAI(
    api_key=GROK_API_KEY,
    base_url=GROK_BASE_URL
)

class DefectClassification(BaseModel):

    category: str

    module: str

    defect_type: str

    severity: Literal[
        "critical",
        "high",
        "medium",
        "low"
    ]

    priority: Literal[
        "critical",
        "high",
        "medium",
        "low"
    ]

    reason: str

def clean_description(description: str) -> str:
    return description.strip()
def suggest_classification(
    title: str,
    description: str
) -> dict:

    prompt = f"""
You are an expert software tester and defect
triage specialist.

Analyze the following software defect.

BUG TITLE:
{title}

BUG DESCRIPTION:
{description}


Classify the defect into:

1. Category
2. Module/component
3. Defect type
4. Severity
5. Priority
6. Reason


CATEGORY:

Choose the most appropriate category.

Examples:

- Payment
- Authentication
- UI/UX
- Performance
- Database
- API
- Security
- Dashboard
- Notifications
- File Upload
- General


MODULE:

Identify the most likely application module.

Examples:

- Payment Gateway
- Auth Service
- Dashboard
- Issue Tracker
- Sprint Planner
- Notifications
- File Uploads

If the module cannot be determined,
return "Unclassified".


DEFECT TYPE:

Choose one:

- Functional Defect
- UI Defect
- Performance Defect
- Security Defect
- Data Defect
- Compatibility Defect
- Integration Defect
- Configuration Defect
- Other


SEVERITY:

critical:
The application is unusable, has major data loss,
a severe security issue, or a major system crash.

high:
Important functionality is broken or a major
workflow cannot be completed.

medium:
Functionality is affected but a workaround
may exist.

low:
Minor, cosmetic, typo, or small inconvenience.


PRIORITY:

critical:
The defect requires immediate attention and should
be fixed before other defects.

high:
The defect is important and should be fixed soon.

medium:
The defect should be fixed during normal development
priorities.

low:
The defect can be fixed later and does not significantly
affect the application.

IMPORTANT:

- Understand the meaning of the defect.
- Do not simply search for keywords.
- Consider the entire title and description.
- Do not invent information.
- Make a reasonable software engineering judgment.

Return ONLY valid JSON.

Use exactly this structure:

{{
    "category": "Payment",
    "module": "Payment Gateway",
    "defect_type": "Functional Defect",
    "severity": "high",
    "priority": "P1",
    "reason": "Short explanation"
}}
"""

    try:

        response = client.chat.completions.create(
            model=GROK_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert software "
                        "testing and defect triage assistant."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2
        )

        content = response.choices[0].message.content

        if not content:
            raise ValueError(
                "Empty response from Groq"
            )

        content = content.strip()

        # Remove markdown fences if returned
        if content.startswith("```"):
            content = content.replace(
                "```json",
                ""
            ).replace(
                "```",
                ""
            ).strip()

        result = json.loads(content)

        # Validate the response
        classification = DefectClassification(
            **result
        )

        return {
            "category": classification.category,
            "module": classification.module,
            "defect_type": classification.defect_type,
            "severity": classification.severity,
            "priority": classification.priority,
            "reason": classification.reason,
            "cleaned_description": clean_description(
                description
            ),
            "ai_generated": True
        }

    except Exception as e:

        return {
            "category": "General",
            "module": "Unclassified",
            "defect_type": "Functional Defect",
            "severity": "medium",
            "priority": "P2",
            "reason": f"AI classification failed: {str(e)}",
            "cleaned_description": clean_description(
                description
            ),
            "ai_generated": False
        }