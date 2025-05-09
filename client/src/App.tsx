import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import SqlBuilder from "@/pages/sql-builder";
import DataSources from "@/pages/data-sources";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <ProtectedRoute path="/" component={Dashboard} />
            <ProtectedRoute path="/sql-builder" component={SqlBuilder} />
            <ProtectedRoute path="/data-sources" component={DataSources} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
