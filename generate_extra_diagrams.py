"""
Generates additional technical diagrams:
1. docs_images/uml_activity_registration.png (Activity Diagram: Teacher Registration & Admin Approval)
2. docs_images/uml_sequence_twostep.png (Sequence Diagram: Two-Step Student Closure Verification)
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# -----------------------------------------------------------------------------
# 1. ACTIVITY DIAGRAM: TEACHER REGISTRATION & APPROVAL
# -----------------------------------------------------------------------------
def generate_activity_registration():
    fig, ax = plt.subplots(figsize=(10, 13), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 13)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')

    LINE_COL = '#1E293B'
    BOX_BG = '#EFF6FF'
    BOX_BORDER = '#2563EB'
    DECISION_BG = '#FEF3C7'
    DECISION_BORDER = '#D97706'
    ACT_BG = '#ECFDF5'
    ACT_BORDER = '#059669'

    # Swimlanes
    ax.plot([5, 5], [0.5, 12], color='#CBD5E1', lw=1.5, ls='--')
    ax.text(2.5, 12.2, "FACULTY APPLICANT", fontsize=11, fontweight='bold', ha='center', color='#1E3A8A')
    ax.text(7.5, 12.2, "COLLEGE ADMINISTRATOR", fontsize=11, fontweight='bold', ha='center', color='#0D9488')

    # Initial Node (Solid black circle)
    start = patches.Circle((2.5, 11.5), 0.22, facecolor='#0F172A', edgecolor='#0F172A')
    ax.add_patch(start)

    # Activity 1: Open New Faculty Registration
    def draw_action(x, y, w, h, text, bg=BOX_BG, border=BOX_BORDER):
        p = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="round,pad=0.08,rounding_size=0.15",
                                   linewidth=1.2, edgecolor=border, facecolor=bg)
        ax.add_patch(p)
        ax.text(x, y, text, fontsize=8, ha='center', va='center', fontweight='bold', color='#0F172A', multialignment='center')

    def draw_decision(x, y, w, h, text):
        diamond = patches.Polygon([[x, y + h/2], [x + w/2, y], [x, y - h/2], [x - w/2, y]],
                                  linewidth=1.2, edgecolor=DECISION_BORDER, facecolor=DECISION_BG)
        ax.add_patch(diamond)
        ax.text(x, y, text, fontsize=7.5, ha='center', va='center', fontweight='bold', color='#78350F')

    def draw_arrow(x1, y1, x2, y2, label=''):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="-|>", color=LINE_COL, lw=1.2))
        if label:
            mx, my = (x1 + x2)/2, (y1 + y2)/2
            ax.text(mx + 0.15, my, label, fontsize=7.5, fontweight='bold', color='#1E40AF')

    draw_arrow(2.5, 11.28, 2.5, 10.7)
    draw_action(2.5, 10.4, 3.6, 0.6, "1. Fill Faculty Registration Form\n(Name, Mobile, College, ID, Dept, Password)")

    draw_arrow(2.5, 10.1, 2.5, 9.5)
    draw_action(2.5, 9.2, 3.4, 0.6, "2. Click 'Verify Mobile & Continue'\n(Request 6-digit OTP)")

    draw_arrow(2.5, 8.9, 2.5, 8.3)
    draw_action(2.5, 8.0, 3.4, 0.6, "3. Read OTP at Top Banner &\nEnter in Verification Box")

    draw_arrow(2.5, 7.7, 2.5, 7.1)
    draw_decision(2.5, 6.7, 2.4, 0.8, "Valid OTP & Format?")

    # Branch: Invalid OTP
    ax.annotate('', xy=(4.2, 9.2), xytext=(3.7, 6.7),
                arrowprops=dict(arrowstyle="-|>", color='#DC2626', lw=1.2, connectionstyle="arc3,rad=-0.3"))
    ax.text(4.2, 7.8, "[No: Retry OTP]", fontsize=7, color='#DC2626', fontweight='bold')

    # Branch: Valid OTP -> Submit request
    draw_arrow(2.5, 6.3, 2.5, 5.6, "[Yes]")
    draw_action(2.5, 5.3, 3.8, 0.6, "4. Create Record with Status:\n'Waiting for Approval' (isVerified=false)", bg='#FEF3C7', border='#F59E0B')

    # Transition to Admin swimlane
    draw_arrow(2.5, 5.0, 7.5, 5.0, "Notify USR-00001")
    draw_action(7.5, 4.4, 3.6, 0.6, "5. Admin Views Pending Faculty\nin Admin Console / Users Hub")

    draw_arrow(7.5, 4.1, 7.5, 3.4)
    draw_decision(7.5, 3.0, 2.4, 0.8, "Admin Decision?")

    # Decision branches: Reject vs Approve
    draw_arrow(6.3, 3.0, 4.0, 3.0, "[Reject]")
    draw_action(2.5, 3.0, 3.0, 0.6, "Status='Not Approved'\nAccess Blocked (403)", bg='#FEE2E2', border='#DC2626')

    draw_arrow(7.5, 2.6, 7.5, 1.9, "[Approve]")
    draw_action(7.5, 1.6, 3.6, 0.6, "6. Update Status='Approved'\n(isVerified=true) & Send Alert", bg=ACT_BG, border=ACT_BORDER)

    # Transition back to Faculty Login
    draw_arrow(7.5, 1.3, 2.5, 1.3)
    draw_action(2.5, 1.3, 3.4, 0.6, "7. Teacher Logs In via Mobile OTP\nor ID/Password -> Open Workspace", bg=ACT_BG, border=ACT_BORDER)

    # End Node
    draw_arrow(2.5, 1.0, 2.5, 0.5)
    end_outer = patches.Circle((2.5, 0.4), 0.22, facecolor='#FFFFFF', edgecolor='#0F172A', lw=1.5)
    end_inner = patches.Circle((2.5, 0.4), 0.14, facecolor='#0F172A')
    ax.add_patch(end_outer)
    ax.add_patch(end_inner)

    # Title
    ax.text(5.0, 12.7, "UML ACTIVITY DIAGRAM: NEW FACULTY REGISTRATION & ADMIN APPROVAL",
            fontsize=11.5, fontweight='bold', color='#1E3A8A', ha='center')

    plt.tight_layout()
    out_path = 'docs_images/uml_activity_registration.png'
    plt.savefig(out_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Generated {out_path} successfully.")


# -----------------------------------------------------------------------------
# 2. SEQUENCE DIAGRAM: TWO-STEP CLOSURE VERIFICATION
# -----------------------------------------------------------------------------
def generate_sequence_twostep():
    fig, ax = plt.subplots(figsize=(11, 8.5), dpi=300)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 8.5)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')

    LINE_COL = '#334155'
    ACTOR_BG = '#1E3A8A'
    LIFELINE_COL = '#94A3B8'

    lifelines = [
        ("Student (Complainant)", 1.2),
        ("Student Portal UI", 3.6),
        ("Backend REST API", 6.0),
        ("Database / Supabase", 8.4),
        ("Assigned Faculty", 10.2)
    ]

    # Draw Actor Boxes and Lifelines
    for title, x in lifelines:
        p = patches.FancyBboxPatch((x - 0.9, 7.6), 1.8, 0.55, boxstyle="round,pad=0.04,rounding_size=0.08",
                                   linewidth=1.2, edgecolor='#1E293B', facecolor=ACTOR_BG)
        ax.add_patch(p)
        ax.text(x, 7.88, title, fontsize=7.5, color='#FFFFFF', fontweight='bold', ha='center', va='center')
        ax.plot([x, x], [0.8, 7.6], color=LIFELINE_COL, lw=1.2, ls='--')

    # Sequence Messages
    steps = [
        # (y, from_x, to_x, text, arrow_type, is_return)
        (7.0, 10.2, 6.0, "1: PATCH /api/complaints/{id}/teacher-update (Note)", "-|>", False),
        (6.5, 10.2, 6.0, "2: POST /api/complaints/{id}/resolve (proof_url, explanation)", "-|>", False),
        (6.0, 6.0, 8.4, "3: UPDATE complaints SET status='Resolved', resolution_proof", "-|>", False),
        (5.5, 6.0, 1.2, "4: Real-time Alert: 'Faculty resolved ticket; please verify fix'", "-|>", False),
        (5.0, 1.2, 3.6, "5: Student reviews resolution photo & explanation", "-|>", False),
        (4.4, 3.6, 6.0, "6: POST /api/complaints/{id}/verify {decision: 'Done', feedback}", "-|>", False),
        (3.8, 6.0, 8.4, "7: UPDATE status='Completed', completed_at=NOW()", "-|>", False),
        (3.2, 6.0, 8.4, "8: INSERT activity_logs (COMPLETED by Student)", "-|>", False),
        (2.6, 6.0, 10.2, "9: Notify Faculty: 'Complaint officially Completed & Closed'", "-|>", False),
        (2.0, 6.0, 1.2, "10: HTTP 200: Ticket Completed (+1 Completed Quota)", "-|>", True),
        (1.4, 3.6, 1.2, "11: UI displays Green 'Completed' badge & resolution stamp", "-|>", True)
    ]

    for y, x1, x2, msg, arr, is_ret in steps:
        ls = ':' if is_ret else '-'
        col = '#059669' if 'Completed' in msg or 'Done' in msg else ('#2563EB' if not is_ret else '#64748B')
        ax.annotate('', xy=(x2, y), xytext=(x1, y),
                    arrowprops=dict(arrowstyle=arr, color=col, lw=1.2, ls=ls))
        mx = (x1 + x2) / 2
        ax.text(mx, y + 0.12, msg, fontsize=7.2, fontweight='bold', color=col, ha='center')

    # Frame Box around the workflow
    frame = patches.Rectangle((0.3, 0.6), 10.4, 7.6, linewidth=1.2, edgecolor='#CBD5E1', facecolor='none')
    ax.add_patch(frame)
    ax.text(0.5, 8.0, "sd: Two-Step Student Closure Verification Loop", fontsize=8.5, fontweight='bold', color='#1E3A8A')

    plt.tight_layout()
    out_path = 'docs_images/uml_sequence_twostep.png'
    plt.savefig(out_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Generated {out_path} successfully.")

if __name__ == '__main__':
    generate_activity_registration()
    generate_sequence_twostep()

