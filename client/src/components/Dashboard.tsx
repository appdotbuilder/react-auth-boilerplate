import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LogOut, User, Settings, Activity } from 'lucide-react';
import { useAuth } from './AuthContext';
import { AppInfo } from './AppInfo';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return null; // This shouldn't happen due to route protection, but good to have
  }

  const userInitials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-blue-600">🚀 Dashboard</div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback className="bg-blue-100 text-blue-700">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.first_name}! 👋
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your account today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Status</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <Badge variant="secondary" className="mt-1">
                {user.is_active ? '✅ Verified' : '❌ Inactive'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Member Since</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user.created_at.toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Account created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {user.updated_at.toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Profile updated
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Your account details and personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {user.first_name} {user.last_name}
                  </h3>
                  <p className="text-gray-600">{user.email}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">First Name</label>
                  <p className="mt-1 text-sm text-gray-900">{user.first_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Name</label>
                  <p className="mt-1 text-sm text-gray-900">{user.last_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email Address</label>
                  <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="mt-1 text-sm text-gray-900">#{user.id}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and settings for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
              <Button variant="outline" className="justify-start">
                🔒 Change Password
              </Button>
              <Button variant="outline" className="justify-start">
                📧 Update Email
              </Button>
              <Button variant="outline" className="justify-start">
                🔔 Notification Settings
              </Button>
              <Button variant="outline" className="justify-start">
                🛡️ Privacy Settings
              </Button>
              <Button variant="outline" className="justify-start">
                📊 Activity Log
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Application Information */}
        <AppInfo />
      </main>
    </div>
  );
};