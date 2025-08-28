import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { PublicUser } from '../../../server/src/schema';

interface UserProfileCardProps {
  user: PublicUser;
  showDetails?: boolean;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ 
  user, 
  showDetails = false 
}) => {
  const userInitials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="flex flex-col items-center space-y-2">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-xl">
            {user.first_name} {user.last_name}
          </CardTitle>
          <p className="text-sm text-gray-600">{user.email}</p>
          <Badge variant={user.is_active ? "default" : "destructive"}>
            {user.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      
      {showDetails && (
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">User ID:</span>
              <span>#{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Member since:</span>
              <span>{user.created_at.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last updated:</span>
              <span>{user.updated_at.toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};