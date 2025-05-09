import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import SqlBuilder from "@/pages/sql-builder";
import DataSources from "@/pages/data-sources";
import { ProtectedRoute } from "@/lib/protected-route";

// Basic routes without auth dependencies for testing
function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <Switch>
            <Route path="/" component={AuthPage} />
            <Route path="/auth" component={AuthPage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default App;
