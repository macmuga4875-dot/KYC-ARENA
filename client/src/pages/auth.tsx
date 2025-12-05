import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, User, ArrowRight, UserPlus, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { register, login } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAuth = async () => {
    setError("");
    
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);

    try {
      let result;
      if (isRegistering) {
        result = await register(username, password);
        toast({
          title: "Account Created",
          description: "Welcome to KYC ARENA!",
        });
      } else {
        result = await login(username, password);
      }

      // Update query cache
      queryClient.setQueryData(["auth"], result);

      // Redirect based on role
      if (result.user.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      toast({
        title: "Authentication Failed",
        description: err.message || "Invalid credentials",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--primary)/0.1),transparent_50%)] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">KYC ARENA</CardTitle>
            <CardDescription>
              {isRegistering ? "Create your secure account" : "Welcome back"}
            </CardDescription>
          </CardHeader>
          <CardContent>
              
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  placeholder="Choose a username..." 
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError("");
                  }}
                  className="bg-secondary/50 border-primary/10 focus:border-primary/50 transition-colors"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && username && password) {
                      handleAuth();
                    }
                  }}
                  className="bg-secondary/50 border-primary/10 focus:border-primary/50 transition-colors"
                  disabled={isLoading}
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <Button 
                  className="w-full mt-4 bg-primary hover:bg-primary/90" 
                  onClick={handleAuth}
                  disabled={!username || !password || isLoading}
                >
                  {isLoading ? (
                    <>Loading...</>
                  ) : isRegistering ? (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" /> Create Account
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-4 w-4" /> Login
                    </>
                  )}
                </Button>
              </motion.div>

              <div className="text-center pt-2">
                <Button 
                  variant="link" 
                  className="text-xs text-muted-foreground hover:text-primary"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError("");
                  }}
                  disabled={isLoading}
                >
                  {isRegistering ? "Already have an account? Login" : "Need an account? Create one"}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>

          </CardContent>
          <CardFooter className="justify-center text-xs text-muted-foreground pt-4 pb-6">
            <Lock className="h-3 w-3 mr-1" /> End-to-end encrypted environment
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
