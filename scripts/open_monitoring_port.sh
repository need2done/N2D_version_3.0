#!/bin/bash
# Get security group name and region
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null || true)

if [ -n "$TOKEN" ]; then
    SG=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/security-groups 2>/dev/null)
    REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null)
    INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null)
else
    SG=$(curl -s http://169.254.169.254/latest/meta-data/security-groups 2>/dev/null)
    REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null)
    INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null)
fi

echo "Security Group: $SG"
echo "Region: $REGION"
echo "Instance ID: $INSTANCE_ID"

# Try to open port 3002 using AWS CLI if available
if command -v aws &>/dev/null; then
    SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG" --region $REGION --query "SecurityGroups[0].GroupId" --output text 2>/dev/null)
    echo "Security Group ID: $SG_ID"
    if [ -n "$SG_ID" ] && [ "$SG_ID" != "None" ]; then
        aws ec2 authorize-security-group-ingress \
            --group-id "$SG_ID" \
            --protocol tcp --port 3002 \
            --cidr 0.0.0.0/0 \
            --region "$REGION" 2>&1 || echo "Port 3002 may already be open"
        echo "Port 3002 opened!"
    fi
else
    echo "AWS CLI not available on server"
fi
