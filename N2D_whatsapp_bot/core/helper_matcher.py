import logging

logger = logging.getLogger(__name__)

def trigger_helper_assignment(order_code):
    """
    Triggers an immediate cycle of the auto assigner to match a helper
    for the newly confirmed order without waiting for the next daemon cycle.
    """
    try:
        logger.info(f"Triggering immediate helper assignment for order {order_code}")
        from auto_assigner import run_auto_assigner
        run_auto_assigner()
    except Exception as e:
        logger.error(f"Error triggering immediate helper assignment: {e}")
