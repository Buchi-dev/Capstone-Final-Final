/**
 * Account Completion Component
 * Allows new users to complete their profile by adding department and phone number
 * After completion, redirects to pending approval page
 * 
 * Architecture: Uses global hooks for authentication and user mutations
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Space, Button, Form, Input, Select, Alert, theme, Divider, message } from "antd";
import { 
  UserOutlined, 
  PhoneOutlined, 
  BankOutlined,
  CheckCircleOutlined 
} from "@ant-design/icons";
import { useAuth } from "../../../hooks";
import { useUserMutations } from "../../../hooks";

const { Title, Text } = Typography;

export const AuthAccountCompletion = () => {
  const { user, loading: authLoading, isAuthenticated, refetchUser } = useAuth();
  const { completeUserProfile, isLoading, error: mutationError } = useUserMutations();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  // Display mutation errors
  useEffect(() => {
    if (mutationError) {
      message.error(mutationError.message || 'Failed to complete profile');
    }
  }, [mutationError]);

  // Pre-fill form with user data
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        middleName: user.middleName || '',
      });
    }
  }, [user, form]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }

    if (user) {
      // If user already has department and phone, skip to appropriate page
      if (user.department && user.phoneNumber) {
        // Profile already complete, redirect based on status
        if (user.status === "active") {
          if (user.role === "admin") {
            navigate("/admin/dashboard");
          } else if (user.role === "staff") {
            navigate("/staff/dashboard");
          } else {
            navigate("/dashboard");
          }
        } else if (user.status === "suspended") {
          navigate("/auth/account-suspended");
        } else if (user.status === "pending") {
          navigate("/auth/pending-approval");
        }
      }
      // If user is already active (not a new user), redirect to dashboard
      else if (user.status === "active") {
        if (user.role === "admin") {
          navigate("/admin/dashboard");
        } else if (user.role === "staff") {
          navigate("/staff/dashboard");
        } else {
          navigate("/dashboard");
        }
      }
      // If suspended, redirect to suspended page
      else if (user.status === "suspended") {
        navigate("/auth/account-suspended");
      }
      // Otherwise, stay on this page to complete profile (pending new user)
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const handleSubmit = async (values: {
    firstName: string;
    lastName: string;
    middleName?: string;
    department: string;
    phoneNumber: string;
  }) => {
    if (!user) return;

    try {
      await completeUserProfile(user._id, {
        firstName: values.firstName,
        lastName: values.lastName,
        middleName: values.middleName,
        department: values.department,
        phoneNumber: values.phoneNumber,
      });

      message.success('Profile completed successfully!');

      // Refresh user data
      await refetchUser();

      // Navigate to pending approval
      navigate("/auth/pending-approval");
    } catch (err) {
      // Error is already handled by useUserMutations hook
      console.error("Error completing profile:", err);
    }
  };

  if (authLoading) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.75)), url('/smu-building.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: token.paddingLG,
      }}
    >
      <Card
        style={{
          maxWidth: 500,
          width: "100%",
          boxShadow: token.boxShadowTertiary,
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 48,
                color: token.colorPrimary,
                marginBottom: 16,
              }}
            >
              <UserOutlined />
            </div>
            <Title level={3} style={{ marginBottom: 8 }}>
              Complete Your Profile
            </Title>
            <Text type="secondary">
              Welcome! Please provide your department and phone number to continue.
            </Text>
          </div>

          <Divider style={{ margin: "8px 0" }} />

          {/* Info Alert */}
          <Alert
            message="Account Setup"
            description="After submitting your information, your account will be sent for admin approval. You'll be notified once approved."
            type="info"
            showIcon
          />

          {/* Form */}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark="optional"
          >
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[
                { required: true, message: "Please enter your first name" },
              ]}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="John"
              />
            </Form.Item>

            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[
                { required: true, message: "Please enter your last name" },
              ]}
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="Doe"
              />
            </Form.Item>

            <Form.Item
              name="middleName"
              label="Middle Name (Optional)"
            >
              <Input
                size="large"
                prefix={<UserOutlined />}
                placeholder="Middle name"
              />
            </Form.Item>

            <Form.Item
              name="department"
              label="Department"
              rules={[
                { required: true, message: "Please select your department" },
              ]}
            >
              <Select
                size="large"
                placeholder="Select your department"
                prefix={<BankOutlined />}
                options={[
                  { value: "Engineering", label: "Engineering" },
                  { value: "Operations", label: "Operations" },
                  { value: "Maintenance", label: "Maintenance" },
                  { value: "Quality Control", label: "Quality Control" },
                  { value: "Research", label: "Research" },
                  { value: "Administration", label: "Administration" },
                  { value: "IT", label: "IT" },
                  { value: "Other", label: "Other" },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[
                { required: true, message: "Please enter your phone number" },
                {
                  pattern: /^09\d{9}$/,
                  message: "Please enter a valid 11-digit Philippine phone number (e.g., 09123456789)",
                },
              ]}
            >
              <Input
                size="large"
                prefix={<PhoneOutlined />}
                placeholder="09123456789"
                maxLength={11}
                onKeyPress={(e) => {
                  // Only allow numbers
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={isLoading}
                icon={<CheckCircleOutlined />}
                block
                style={{
                  height: 48,
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                Complete Profile
              </Button>
            </Form.Item>
          </Form>

          {/* User Info */}
          {user && (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Logged in as: {user.email}
              </Text>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};
