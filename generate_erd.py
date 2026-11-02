"""
Generates high-resolution publication-quality diagrams for the Student Complaint Box report:
1. docs_images/erd_diagram.png (Entity Relationship Diagram - 7 Tables with PK/FK/Relations)
2. docs_images/uml_activity_registration.png (Activity Diagram: Faculty Registration & Approval)
3. docs_images/uml_sequence_twostep.png (Sequence Diagram: Two-Step Student Satisfaction Loop)
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

os.makedirs('docs_images', exist_ok=True)

# -----------------------------------------------------------------------------
# 1. ER DIAGRAM (docs_images/erd_diagram.png)
# -----------------------------------------------------------------------------
def generate_erd():
    fig, ax = plt.subplots(figsize=(15, 10), dpi=300)
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 10)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')

    # Color Palette
    HEADER_BG = '#1E3A8A'      # Deep Navy
    HEADER_TXT = '#FFFFFF'
    TABLE_BG = '#F8FAFC'       # Light slate
    BORDER_COL = '#334155'     # Slate border
    PK_COL = '#D97706'         # Amber/Orange PK
    FK_COL = '#2563EB'         # Royal Blue FK
    LINE_COL = '#475569'

    tables = {
        'colleges': {
            'pos': (0.8, 6.2, 3.2, 3.2),
            'cols': [
                ('PK', 'id', 'TEXT (4-digit ID)'),
                ('  ', 'name', 'TEXT (College Name)'),
                ('  ', 'code', 'TEXT (e.g. SDACS)'),
                ('  ', 'status', 'TEXT (active/inactive)'),
                ('  ', 'principal_name', 'TEXT'),
                ('  ', 'contact_email', 'TEXT'),
                ('  ', 'affiliation', 'TEXT (Univ Mumbai)')
            ]
        },
        'users': {
            'pos': (5.8, 5.8, 3.4, 3.8),
            'cols': [
                ('PK', 'id', 'TEXT (USR-00001)'),
                ('FK', 'college_id', 'TEXT -> colleges.id'),
                ('  ', 'role', 'TEXT (student/teacher/admin)'),
                ('  ', 'name', 'TEXT (Full Name)'),
                ('  ', 'mobile', 'TEXT UNIQUE (10-digit)'),
                ('  ', 'email', 'TEXT'),
                ('  ', 'student_id', 'TEXT (5555-S01)'),
                ('  ', 'teacher_id', 'TEXT (EMP-FAC-991)'),
                ('  ', 'department', 'TEXT'),
                ('  ', 'designation', 'TEXT'),
                ('  ', 'approval_status', 'TEXT (Approved/Waiting)'),
                ('  ', 'complaint_limit', 'INTEGER (Default 10)')
            ]
        },
        'complaints': {
            'pos': (10.8, 4.5, 3.4, 4.8),
            'cols': [
                ('PK', 'id', 'TEXT (CMP-0001)'),
                ('FK', 'college_id', 'TEXT -> colleges.id'),
                ('FK', 'student_user_id', 'TEXT -> users.id'),
                ('FK', 'assigned_teacher_id', 'TEXT -> users.id'),
                ('  ', 'title', 'TEXT'),
                ('  ', 'category', 'TEXT (Infrastructure...)'),
                ('  ', 'priority', 'TEXT (Urgent/High...)'),
                ('  ', 'status', 'TEXT (Pending/In Progress...)'),
                ('  ', 'sla_hours', 'INTEGER (24/48/72)'),
                ('  ', 'deadline_at', 'TIMESTAMPTZ'),
                ('  ', 'is_escalated', 'BOOLEAN'),
                ('  ', 'proofs', 'JSONB (Photo URLs)'),
                ('  ', 'resolution_proof', 'JSONB'),
                ('  ', 'verification', 'JSONB (Done/Not Done)')
            ]
        },
        'activity_logs': {
            'pos': (0.8, 1.0, 3.2, 3.4),
            'cols': [
                ('PK', 'id', 'TEXT (ACT-0001)'),
                ('FK', 'complaint_id', 'TEXT -> complaints.id'),
                ('  ', 'action', 'TEXT (TRIAGED/ASSIGNED)'),
                ('  ', 'actor_role', 'TEXT (student/teacher/admin)'),
                ('  ', 'actor_name', 'TEXT'),
                ('  ', 'details', 'TEXT (Audit Details)'),
                ('  ', 'timestamp', 'TIMESTAMPTZ')
            ]
        },
        'comments': {
            'pos': (5.0, 1.0, 3.0, 3.2),
            'cols': [
                ('PK', 'id', 'TEXT (CMT-0001)'),
                ('FK', 'complaint_id', 'TEXT -> complaints.id'),
                ('FK', 'author_id', 'TEXT -> users.id'),
                ('  ', 'author_name', 'TEXT'),
                ('  ', 'author_role', 'TEXT'),
                ('  ', 'is_official', 'BOOLEAN'),
                ('  ', 'text', 'TEXT'),
                ('  ', 'created_at', 'TIMESTAMPTZ')
            ]
        },
        'notifications': {
            'pos': (9.0, 1.0, 2.8, 3.0),
            'cols': [
                ('PK', 'id', 'TEXT (NTF-0001)'),
                ('FK', 'user_id', 'TEXT -> users.id'),
                ('  ', 'role', 'TEXT'),
                ('  ', 'title', 'TEXT'),
                ('  ', 'message', 'TEXT'),
                ('  ', 'is_read', 'BOOLEAN'),
                ('  ', 'created_at', 'TIMESTAMPTZ')
            ]
        },
        'reports': {
            'pos': (12.2, 1.0, 2.6, 2.8),
            'cols': [
                ('PK', 'id', 'TEXT (REP-0001)'),
                ('FK', 'complaint_id', 'TEXT -> complaints.id'),
                ('  ', 'reason', 'TEXT'),
                ('  ', 'details', 'TEXT'),
                ('  ', 'status', 'TEXT (pending/resolved)'),
                ('  ', 'created_at', 'TIMESTAMPTZ')
            ]
        }
    }

    # Draw each table box
    for t_name, data in tables.items():
        x, y, w, h = data['pos']
        # Outer box
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.04,rounding_size=0.08",
                                     linewidth=1.2, edgecolor=BORDER_COL, facecolor=TABLE_BG)
        ax.add_patch(rect)
        # Header box
        header_h = 0.55
        h_rect = patches.Rectangle((x, y + h - header_h), w, header_h,
                                   linewidth=0, facecolor=HEADER_BG)
        ax.add_patch(h_rect)
        ax.text(x + w/2, y + h - header_h/2, t_name.upper(), color=HEADER_TXT,
                fontsize=9.5, fontweight='bold', ha='center', va='center', fontfamily='sans-serif')

        # Attributes
        row_y = y + h - header_h - 0.22
        col_step = (h - header_h - 0.2) / max(len(data['cols']), 1)
        for key_type, col_name, data_type in data['cols']:
            # Key marker
            if key_type == 'PK':
                ax.text(x + 0.12, row_y, 'PK', color=PK_COL, fontsize=7.5, fontweight='bold', va='center')
            elif key_type == 'FK':
                ax.text(x + 0.12, row_y, 'FK', color=FK_COL, fontsize=7.5, fontweight='bold', va='center')
            else:
                ax.text(x + 0.12, row_y, '•', color='#94A3B8', fontsize=8, va='center')

            # Column Name
            ax.text(x + 0.42, row_y, col_name, color='#0F172A', fontsize=7.5, fontweight='bold', va='center')
            # Column Type
            ax.text(x + w - 0.1, row_y, data_type, color='#64748B', fontsize=6.5, ha='right', va='center')
            row_y -= col_step

    # Draw Relationship Connectors
    # 1. colleges (1) -> (N) users
    ax.annotate('', xy=(5.8, 7.8), xytext=(4.0, 7.8),
                arrowprops=dict(arrowstyle="-|>", color=LINE_COL, lw=1.5))
    ax.text(4.2, 7.95, '1:N', fontsize=8, color=LINE_COL, fontweight='bold')

    # 2. colleges (1) -> (N) complaints
    ax.annotate('', xy=(10.8, 8.2), xytext=(4.0, 8.5),
                arrowprops=dict(arrowstyle="-|>", color=LINE_COL, lw=1.2, connectionstyle="arc3,rad=-0.12"))
    ax.text(7.4, 8.7, '1:N (Institution Scope)', fontsize=7.5, color=LINE_COL, fontweight='bold')

    # 3. users (1) -> (N) complaints (Student submitter)
    ax.annotate('', xy=(10.8, 7.2), xytext=(9.2, 7.2),
                arrowprops=dict(arrowstyle="-|>", color=LINE_COL, lw=1.5))
    ax.text(9.5, 7.35, '1:N', fontsize=8, color=LINE_COL, fontweight='bold')

    # 4. users (1) -> (N) complaints (Assigned Resolver)
    ax.annotate('', xy=(10.8, 6.6), xytext=(9.2, 6.6),
                arrowprops=dict(arrowstyle="-|>", color=LINE_COL, lw=1.2, ls='--'))
    ax.text(9.4, 6.4, '1:N (Resolver)', fontsize=7, color=LINE_COL)

    # 5. complaints (1) -> (N) activity_logs
    ax.annotate('', xy=(4.0, 2.8), xytext=(11.5, 4.5),
                arrowprops=dict(arrowstyle="-|>", color=LINE_COL, lw=1.2, connectionstyle="arc3,rad=0.18"))
    ax.text(7.8, 3.4, '1:N (Audit Trail)', fontsize=7.5, color=LINE_COL, fontweight='bold')

    # 6. complaints (1) -> (N) comments
    ax.annotate('', xy=(8.0, 2.6), xytext=(11.2, 4.5),
                arrowprops=dict(arrowstyle="-|>", color=LINE_COL, lw=1.2, connectionstyle="arc3,rad=0.12"))
    ax.text(9.3, 3.2, '1:N (Discussion)', fontsize=7.5, color=LINE_COL, fontweight='bold')

    # 7. complaints (1) -> (N) reports
    ax.annotate('', xy=(13.0, 3.8), xytext=(12.8, 4.5),
                arrowprops=dict(arrowstyle="-|>", color=LINE_COL, lw=1.2))
    ax.text(13.1, 4.1, '1:N', fontsize=7.5, color=LINE_COL, fontweight='bold')

    # 8. users (1) -> (N) notifications
    ax.annotate('', xy=(10.0, 4.0), xytext=(7.5, 5.8),
                arrowprops=dict(arrowstyle="-|>", color=LINE_COL, lw=1.2, connectionstyle="arc3,rad=-0.15"))
    ax.text(8.8, 4.8, '1:N (System Alerts)', fontsize=7.5, color=LINE_COL, fontweight='bold')

    # Title Banner
    ax.text(7.5, 9.7, 'STUDENT COMPLAINT BOX — ENTITY RELATIONSHIP DIAGRAM (ERD)',
            fontsize=13, fontweight='bold', color='#1E3A8A', ha='center')

    plt.tight_layout()
    out_path = 'docs_images/erd_diagram.png'
    plt.savefig(out_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Generated {out_path} successfully.")

if __name__ == '__main__':
    generate_erd()

