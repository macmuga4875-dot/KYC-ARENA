import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, History, ShieldAlert, CheckCircle2, Clock, ShieldCheck, AlertTriangle, Pencil, Trash2, DollarSign, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSubmissions, useExchanges, useCreateSubmission, useUpdateSubmission, useDeleteSubmission, usePortalStatus, useDeleteAllCheckedAccounts, useUserStats } from "@/lib/api";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Submission } from "@shared/schema";

export default function UserDashboard() {
  const { data: rawSubmissions = [], isLoading: submissionsLoading } = useSubmissions();
  const { data: exchanges = [] } = useExchanges();
  const { data: portalStatus, refetch: refetchPortalStatus, isLoading: portalLoading } = usePortalStatus();
  const { data: userStats } = useUserStats();
  const createSubmission = useCreateSubmission();
  const updateSubmission = useUpdateSubmission();
  const deleteSubmissionMutation = useDeleteSubmission();
  const deleteAllCheckedMutation = useDeleteAllCheckedAccounts();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [exchange, setExchange] = useState("");
  const { toast } = useToast();

  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editExchange, setEditExchange] = useState("");
  const [deleteSubmissionId, setDeleteSubmissionId] = useState<number | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const submissions = Array.isArray(rawSubmissions) ? rawSubmissions : [];

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const goodCount = submissions.filter(s => s.status === 'good').length;
  const badCount = submissions.filter(s => s.status === 'bad').length;
  const wrongPasswordCount = submissions.filter(s => s.status === 'wrong_password').length;

  const totalPrice = useMemo(() => {
    const goodSubmissions = submissions.filter(s => s.status === 'good');
    let total = 0;
    goodSubmissions.forEach(sub => {
      const exchange = exchanges.find(ex => ex.name === sub.exchange);
      if (exchange) {
        total += parseFloat(exchange.priceUsdt || "0");
      }
    });
    return total;
  }, [submissions, exchanges]);

  const openEditDialog = (sub: Submission) => {
    setEditingSubmission(sub);
    setEditEmail(sub.email);
    setEditPassword(sub.passwordHash);
    setEditExchange(sub.exchange);
  };

  const handleEdit = () => {
    if (!editingSubmission) return;
    updateSubmission.mutate(
      { id: editingSubmission.id, data: { email: editEmail, passwordHash: editPassword, exchange: editExchange } },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Account updated successfully" });
          setEditingSubmission(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update account", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteSubmissionId) return;
    deleteSubmissionMutation.mutate(deleteSubmissionId, {
      onSuccess: () => {
        toast({ title: "Deleted", description: "Account has been removed" });
        setDeleteSubmissionId(null);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete account", variant: "destructive" });
      },
    });
  };

  const handleBulkDelete = () => {
    const checkedCount = badCount + goodCount + wrongPasswordCount;
    deleteAllCheckedMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast({ 
          title: "Success", 
          description: `Deleted ${data.deletedCount} checked account${data.deletedCount !== 1 ? 's' : ''}`
        });
        setShowBulkDeleteConfirm(false);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete accounts", variant: "destructive" });
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !exchange) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }
    
    createSubmission.mutate(
      { email, passwordHash: password, exchange },
      {
        onSuccess: () => {
          toast({
            title: "Account Submitted",
            description: "Your submission is pending approval.",
          });
          setEmail("");
          setPassword("");
          setExchange("");
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to submit account",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleExportPDF = () => {
    toast({
      title: "Generating PDF...",
      description: "Your submission report is being generated.",
    });

    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(18);
    doc.text("Submission Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${date}`, 14, 30);
    
    doc.setFontSize(12);
    doc.text("Summary:", 14, 42);
    doc.setFontSize(10);
    doc.text(`Good Accounts: ${goodCount}`, 14, 50);
    doc.text(`Total Value: $${totalPrice.toFixed(2)} USDT`, 14, 56);
    doc.text(`Pending: ${pendingCount} | Wrong Password: ${wrongPasswordCount} | Bad: ${badCount}`, 14, 62);

    const tableData = submissions.map(sub => {
      const exchange = exchanges.find(ex => ex.name === sub.exchange);
      const price = exchange ? parseFloat(exchange.priceUsdt || "0") : 0;
      return [
        sub.exchange,
        sub.email,
        sub.status.replace('_', ' ').toUpperCase(),
        sub.status === 'good' ? `$${price.toFixed(2)}` : '-'
      ];
    });

    autoTable(doc, {
      startY: 70,
      head: [['Exchange', 'Email', 'Status', 'Price (USDT)']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 70;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Good Accounts Value: $${totalPrice.toFixed(2)} USDT`, 14, finalY + 10);

    doc.save(`submission_report_${date.replace(/\//g, '-')}.pdf`);
    
    toast({
      title: "Download Complete",
      description: "PDF report saved to device.",
    });
  };

  const handleExportExcel = () => {
    toast({
      title: "Generating Excel...",
      description: "Your submission report is being generated.",
    });

    const data = submissions.map(sub => {
      const exchange = exchanges.find(ex => ex.name === sub.exchange);
      const price = exchange ? parseFloat(exchange.priceUsdt || "0") : 0;
      return {
        'Exchange': sub.exchange,
        'Email': sub.email,
        'Status': sub.status.replace('_', ' ').toUpperCase(),
        'Price (USDT)': sub.status === 'good' ? price.toFixed(2) : '0.00',
        'Created At': new Date(sub.createdAt).toLocaleDateString()
      };
    });

    data.push({
      'Exchange': '',
      'Email': '',
      'Status': 'TOTAL',
      'Price (USDT)': totalPrice.toFixed(2),
      'Created At': ''
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Submissions');
    
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    XLSX.writeFile(wb, `submission_report_${date}.xlsx`);
    
    toast({
      title: "Download Complete",
      description: "Excel report saved to device.",
    });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setShowBulkDeleteConfirm(true)}
              disabled={badCount + goodCount + wrongPasswordCount === 0}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-delete-all-checked"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Checked ({badCount + goodCount + wrongPasswordCount})
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="border-primary/20 hover:bg-primary/10" data-testid="button-export-pdf">
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="border-primary/20 hover:bg-primary/10" data-testid="button-export-excel">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-yellow-500/10 border-yellow-500/20" data-testid="card-pending-count">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-yellow-500" data-testid="text-pending-count">{pendingCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20" data-testid="card-good-count">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-500" data-testid="text-good-count">{goodCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Good</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20" data-testid="card-wrong-password-count">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-500" data-testid="text-wrong-password-count">{wrongPasswordCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Wrong Pass</div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/20" data-testid="card-bad-count">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <ShieldAlert className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-500" data-testid="text-bad-count">{badCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Bad</div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/10 border-emerald-500/20" data-testid="card-total-price">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-500 font-mono" data-testid="text-total-price">${totalPrice.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</div>
            </CardContent>
          </Card>
        </div>

        {/* Career Achievements */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 shadow-lg" data-testid="card-achievements">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Career Achievements
            </CardTitle>
            <CardDescription>Your lifetime KYC Arena performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-background/50 border border-primary/20 rounded-lg p-4 hover:bg-background/80 transition-colors">
                <div className="text-sm text-muted-foreground font-medium mb-1">Total Submissions</div>
                <div className="text-3xl font-bold text-primary">{userStats?.totalSubmissions || 0}</div>
                <div className="text-xs text-muted-foreground mt-2">accounts verified</div>
              </div>
              
              <div className="bg-background/50 border border-green-500/20 rounded-lg p-4 hover:bg-background/80 transition-colors">
                <div className="text-sm text-muted-foreground font-medium mb-1">Successful Validations</div>
                <div className="text-3xl font-bold text-green-500">{userStats?.totalGood || 0}</div>
                <div className="text-xs text-muted-foreground mt-2">{(userStats?.totalSubmissions || 0) > 0 ? (((userStats?.totalGood || 0) / (userStats?.totalSubmissions || 1)) * 100).toFixed(1) : 0}% success rate</div>
              </div>

              <div className="bg-background/50 border border-red-500/20 rounded-lg p-4 hover:bg-background/80 transition-colors">
                <div className="text-sm text-muted-foreground font-medium mb-1">Failed Validations</div>
                <div className="text-3xl font-bold text-red-500">{userStats?.totalBad || 0}</div>
                <div className="text-xs text-muted-foreground mt-2">{(userStats?.totalSubmissions || 0) > 0 ? (((userStats?.totalBad || 0) / (userStats?.totalSubmissions || 1)) * 100).toFixed(1) : 0}% failure rate</div>
              </div>

              <div className="bg-background/50 border border-amber-500/20 rounded-lg p-4 hover:bg-background/80 transition-colors">
                <div className="text-sm text-muted-foreground font-medium mb-1">Wrong Passwords</div>
                <div className="text-3xl font-bold text-amber-500">{userStats?.totalWrongPassword || 0}</div>
                <div className="text-xs text-muted-foreground mt-2">{(userStats?.totalSubmissions || 0) > 0 ? (((userStats?.totalWrongPassword || 0) / (userStats?.totalSubmissions || 1)) * 100).toFixed(1) : 0}% error rate</div>
              </div>

              <div className="md:col-span-2 lg:col-span-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground font-medium mb-1">Total Earnings (Lifetime)</div>
                    <div className="text-4xl font-bold text-emerald-500 font-mono">${parseFloat(userStats?.lifetimeEarnings || "0").toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground mt-2">from {userStats?.lifetimeGood || 0} successful validations</div>
                  </div>
                  <div className="hidden md:block">
                    <div className="text-6xl opacity-20">💰</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State for Portal Status */}
        {portalLoading && (
          <Card className="border-muted shadow-lg" data-testid="card-portal-loading">
            <CardContent className="p-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center animate-pulse">
                  <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
                <p className="text-muted-foreground">Checking portal status...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Portal Closed Message */}
        {!portalLoading && portalStatus !== undefined && !portalStatus.isOpen && (
          <Card className="border-amber-500/50 bg-amber-500/10 shadow-lg" data-testid="card-portal-closed">
            <CardContent className="p-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-amber-500 mb-2">The portal is not open right now</h2>
                  <p className="text-muted-foreground">Keep refreshing for updates</p>
                </div>
                <Button 
                  variant="outline" 
                  className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
                  onClick={() => refetchPortalStatus()}
                  data-testid="button-refresh-portal"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submission Form - Only show when portal is open */}
        {!portalLoading && portalStatus !== undefined && portalStatus.isOpen && (
          <Card className="border-primary/20 shadow-lg shadow-primary/5 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> New Submission
              </CardTitle>
              <CardDescription>Securely upload credentials for validation</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="exchange">Exchange / Platform</Label>
                  <Select value={exchange} onValueChange={setExchange}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select platform..." />
                    </SelectTrigger>
                    <SelectContent>
                      {exchanges.filter(e => e.isActive).map((ex) => (
                        <SelectItem key={ex.id} value={ex.name}>{ex.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="email">Email / Username</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="user@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="password">Password / Key</Label>
                  <Input 
                    id="password" 
                    type="text" 
                    placeholder="Enter password..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="bg-background/50 font-mono"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                  disabled={createSubmission.isPending}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" /> 
                  {createSubmission.isPending ? "Submitting..." : "Submit for Validation"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Recent History */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" /> Recent Activity
          </h2>
          
          {submissionsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
              No submissions yet
            </div>
          ) : (
            <div className="grid gap-3">
              {submissions.map((sub) => (
                <Card key={sub.id} className="overflow-hidden transition-all hover:bg-secondary/30" data-testid={`card-submission-${sub.id}`}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 
                        ${sub.status === 'good' ? 'bg-green-500/10 text-green-500' : 
                          sub.status === 'bad' ? 'bg-red-500/10 text-red-500' : 
                          sub.status === 'wrong_password' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-yellow-500/10 text-yellow-500'}`}>
                        {sub.status === 'good' ? <CheckCircle2 className="h-5 w-5" /> : 
                         sub.status === 'bad' ? <ShieldAlert className="h-5 w-5" /> : 
                         sub.status === 'wrong_password' ? <AlertTriangle className="h-5 w-5" /> :
                         <Clock className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{sub.exchange}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">{sub.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => openEditDialog(sub)}
                        data-testid={`button-edit-${sub.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => setDeleteSubmissionId(sub.id)}
                        data-testid={`button-delete-${sub.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Badge variant={sub.status === 'pending' ? 'outline' : 'default'} 
                        className={cn(
                          "ml-2 capitalize",
                          sub.status === 'good' && "bg-green-500 hover:bg-green-600",
                          sub.status === 'bad' && "bg-red-500 hover:bg-red-600",
                          sub.status === 'wrong_password' && "bg-amber-500 hover:bg-amber-600",
                          sub.status === 'pending' && "text-yellow-500 border-yellow-500/50"
                        )}>
                        {sub.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSubmission} onOpenChange={(open) => !open && setEditingSubmission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Update the account details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-exchange">Exchange</Label>
              <Select value={editExchange} onValueChange={setEditExchange}>
                <SelectTrigger data-testid="select-edit-exchange">
                  <SelectValue placeholder="Select exchange..." />
                </SelectTrigger>
                <SelectContent>
                  {exchanges.filter(e => e.isActive).map((ex) => (
                    <SelectItem key={ex.id} value={ex.name}>{ex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email / Username</Label>
              <Input 
                id="edit-email" 
                value={editEmail} 
                onChange={(e) => setEditEmail(e.target.value)}
                data-testid="input-edit-email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">Password / Key</Label>
              <Input 
                id="edit-password" 
                type="text"
                value={editPassword} 
                onChange={(e) => setEditPassword(e.target.value)}
                className="font-mono"
                data-testid="input-edit-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubmission(null)} data-testid="button-edit-cancel">
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={updateSubmission.isPending} data-testid="button-edit-save">
              {updateSubmission.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSubmissionId} onOpenChange={(open) => !open && setDeleteSubmissionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-delete-confirm"
            >
              {deleteSubmissionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Checked Accounts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all Good, Bad, and Wrong Password accounts ({badCount + goodCount + wrongPasswordCount} total). Pending accounts will be preserved and not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-bulk-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-bulk-delete-confirm"
            >
              {deleteAllCheckedMutation.isPending ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
