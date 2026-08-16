"""Apply the strict automatic-only face-match policy.

Revision ID: 20260816_09
Revises: 20260816_08
"""

import sqlalchemy as sa
from alembic import op

revision = "20260816_09"
down_revision = "20260816_08"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Normalize legacy review and manually decided rows using the new policy.
    # Low-resolution detections require the configured five-point boost.
    op.execute(
        sa.text(
            """
            WITH policy AS (
                SELECT
                    fm.id,
                    fm.participant_id IS NOT NULL
                    AND fd.quality_class <> 'REJECTED'
                    AND fm.confidence >= CASE
                        WHEN fd.quality_class = 'LOW_RESOLUTION' THEN 0.91
                        ELSE 0.86
                    END
                    AND COALESCE(fm.margin, 0) >= 0.10 AS qualifies
                FROM face_matches AS fm
                JOIN face_detections AS fd ON fd.id = fm.detection_id
            )
            UPDATE face_matches AS fm
            SET
                participant_id = CASE WHEN policy.qualifies THEN fm.participant_id ELSE NULL END,
                state = CASE WHEN policy.qualifies THEN 'high' ELSE 'low' END,
                decision_source = 'AUTO',
                threshold_profile_version = 'strict-auto-v2',
                reviewed_by = NULL,
                reviewed_at = NULL
            FROM policy
            WHERE policy.id = fm.id
            """
        )
    )


def downgrade() -> None:
    # Match decisions cannot be safely reconstructed under the older policy.
    pass
