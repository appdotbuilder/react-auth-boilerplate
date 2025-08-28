import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

export const AppInfo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📋 Application Information
        </CardTitle>
        <CardDescription>
          Learn more about this authentication demo application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>View Features & Implementation Details</span>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">🔐 Authentication Features</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• User registration with validation</li>
                  <li>• Secure login with error handling</li>
                  <li>• Session management with localStorage</li>
                  <li>• Automatic session validation on app load</li>
                  <li>• Protected routes and components</li>
                  <li>• Graceful logout functionality</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">🚀 Technical Stack</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• React 18+ with TypeScript</li>
                  <li>• tRPC for type-safe API communication</li>
                  <li>• Radix UI components with Tailwind CSS</li>
                  <li>• Context API for state management</li>
                  <li>• Zod schemas for type validation</li>
                  <li>• Error boundaries for robust error handling</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">🎨 UI/UX Features</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• Responsive design for all screen sizes</li>
                  <li>• Loading states and form validation</li>
                  <li>• Accessible components from Radix UI</li>
                  <li>• Clean, modern design with gradients</li>
                  <li>• Interactive dashboard with user profile</li>
                  <li>• Smooth transitions and animations</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">⚠️ Demo Limitations</h4>
                <ul className="text-sm text-amber-700 space-y-1 ml-4">
                  <li>• Backend uses placeholder/stub implementations</li>
                  <li>• No real database persistence</li>
                  <li>• Authentication tokens are placeholders</li>
                  <li>• Password hashing is not implemented</li>
                  <li>• Session validation returns mock data</li>
                </ul>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};