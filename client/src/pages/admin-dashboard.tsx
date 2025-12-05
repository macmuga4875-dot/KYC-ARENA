import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, FileSpreadsheet, Search, PlusCircle, AlertTriangle, Filter, X, Users, UserCheck, UserX, KeyRound, Download, Trash2, Power } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
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
  DialogTrigger,
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSubmissionsPaginated, useExchanges, useUsers, useUpdateSubmissionStatus, useCreateExchange, useToggleExchange, useUpdateExchangePrice, useApproveUser, useToggleUserEnabled, useResetUserPassword, useDeleteUser, usePortalStatus, useTogglePortalStatus, getAllSubmissionsForExport, useDeleteAllCheckedAccounts, type SubmissionWithUser, type PaginatedSubmissions } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminDashboard() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const ITEMS_PER_PAGE = 50;
  
  const { data: paginatedData, isLoading: submissionsLoading, isFetching } = useSubmissionsPaginated(page, ITEMS_PER_PAGE, search, statusFilter);
  const { data: exchanges = [] } = useExchanges();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const updateStatus = useUpdateSubmissionStatus();
  const createExchange = useCreateExchange();
  const toggleExchange = useToggleExchange();
  const updateExchangePrice = useUpdateExchangePrice();
  const approveUser = useApproveUser();
  const toggleUserEnabled = useToggleUserEnabled();
  const resetPassword = useResetUserPassword();
  const deleteUser = useDeleteUser();
  const deleteAllChecked = useDeleteAllCheckedAccounts();
  const { data: portalStatus } = usePortalStatus();
  const togglePortalStatus = useTogglePortalStatus();
  
  const submissions = paginatedData?.data || [];
  const totalSubmissions = paginatedData?.total || 0;
  const totalPages = paginatedData?.totalPages || 1;
  
  const [newExchangeName, setNewExchangeName] = useState("");
  const [newExchangePrice, setNewExchangePrice] = useState("");
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [editPriceExchangeId, setEditPriceExchangeId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [deleteUserName, setDeleteUserName] = useState("");
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [pdfStatusFilter, setPdfStatusFilter] = useState<string>("all");
  const [pdfUserFilter, setPdfUserFilter] = useState<string>("all");
  const [pdfShowPassword, setPdfShowPassword] = useState(true);

  const pendingApprovalCount = users.filter(u => !u.isApproved && u.role !== 'admin').length;
  const disabledUsersCount = users.filter(u => !u.isEnabled).length;

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const goodCount = submissions.filter(s => s.status === 'good').length;
  const badCount = submissions.filter(s => s.status === 'bad').length;
  const wrongPasswordCount = submissions.filter(s => s.status === 'wrong_password').length;

  const hasActiveFilters = statusFilter !== "all" || search !== "";

  const clearFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setPage(1);
  };
  
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleBulkDelete = () => {
    deleteAllChecked.mutate(undefined, {
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

  const handleAddExchange = () => {
    if (!newExchangeName) return;
    const price = parseFloat(newExchangePrice || "0");
    if (!Number.isFinite(price) || price < 0) {
      toast({ title: "Error", description: "Please enter a valid positive price", variant: "destructive" });
      return;
    }
    createExchange.mutate({ name: newExchangeName, priceUsdt: price.toFixed(2) }, {
      onSuccess: () => {
        setNewExchangeName("");
        setNewExchangePrice("");
        setIsDialogOpen(false);
        toast({ title: "Success", description: "Exchange added successfully" });
      },
    });
  };

  const handleUpdatePrice = () => {
    if (editPriceExchangeId === null) return;
    const price = parseFloat(editPrice || "0");
    if (!Number.isFinite(price) || price < 0) {
      toast({ title: "Error", description: "Please enter a valid positive price", variant: "destructive" });
      return;
    }
    updateExchangePrice.mutate({ id: editPriceExchangeId, priceUsdt: price.toFixed(2) }, {
      onSuccess: () => {
        setEditPriceExchangeId(null);
        setEditPrice("");
        toast({ title: "Success", description: "Price updated successfully" });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update price", variant: "destructive" });
      },
    });
  };

  const openEditPriceDialog = (ex: { id: number; priceUsdt: string }) => {
    setEditPriceExchangeId(ex.id);
    setEditPrice(ex.priceUsdt);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsPdfDialogOpen(false);
    setIsExporting(true);
    
    toast({
      title: "Generating PDF...",
      description: "Fetching all submissions for export...",
    });

    try {
      const allSubmissions = await getAllSubmissionsForExport();
      
      let filteredData = allSubmissions.filter((s: SubmissionWithUser) => {
        const matchesStatus = pdfStatusFilter === "all" || s.status === pdfStatusFilter;
        const matchesUser = pdfUserFilter === "all" || s.userId.toString() === pdfUserFilter;
        return matchesStatus && matchesUser;
      });

      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();
      
      doc.setFontSize(18);
      doc.text("Admin Submission Report", 14, 22);
      doc.setFontSize(11);
      doc.text(`Generated: ${date}`, 14, 30);
      
      const statusLabel = pdfStatusFilter === "all" ? "All Statuses" : pdfStatusFilter.replace('_', ' ').toUpperCase();
      const userLabel = pdfUserFilter === "all" ? "All Users" : users.find(u => u.id.toString() === pdfUserFilter)?.username || "Unknown";
      doc.text(`Filters: ${statusLabel} | ${userLabel}`, 14, 38);
      
      const filteredPending = filteredData.filter((s: SubmissionWithUser) => s.status === 'pending').length;
      const filteredGood = filteredData.filter((s: SubmissionWithUser) => s.status === 'good').length;
      const filteredBad = filteredData.filter((s: SubmissionWithUser) => s.status === 'bad').length;
      const filteredWrongPass = filteredData.filter((s: SubmissionWithUser) => s.status === 'wrong_password').length;
      
      doc.setFontSize(12);
      doc.text("Summary:", 14, 48);
      doc.setFontSize(10);
      doc.text(`Good: ${filteredGood} | Pending: ${filteredPending} | Wrong Password: ${filteredWrongPass} | Bad: ${filteredBad}`, 14, 56);

      const totalPrice = filteredData
        .filter((s: SubmissionWithUser) => s.status === 'good')
        .reduce((sum: number, sub: SubmissionWithUser) => {
          const ex = exchanges.find(e => e.name === sub.exchange);
          return sum + parseFloat(ex?.priceUsdt || "0");
        }, 0);
      
      doc.text(`Total Good Accounts Value: $${totalPrice.toFixed(2)} USDT`, 14, 62);

      const groupedByUser: Record<string, SubmissionWithUser[]> = {};
      filteredData.forEach((sub: SubmissionWithUser) => {
        const username = sub.username || 'Unknown';
        if (!groupedByUser[username]) {
          groupedByUser[username] = [];
        }
        groupedByUser[username].push(sub);
      });

      let currentY = 72;

      Object.entries(groupedByUser).forEach(([username, userSubmissions]) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${username} (${userSubmissions.length} accounts)`, 14, currentY);
        doc.setFont('helvetica', 'normal');
        
        const tableData = userSubmissions.map((sub: SubmissionWithUser) => {
          const ex = exchanges.find(e => e.name === sub.exchange);
          const price = ex ? parseFloat(ex.priceUsdt || "0") : 0;
          if (pdfShowPassword) {
            return [
              sub.exchange,
              sub.email,
              sub.passwordHash,
              sub.status.replace('_', ' ').toUpperCase(),
              sub.status === 'good' ? `$${price.toFixed(2)}` : '-'
            ];
          } else {
            return [
              sub.exchange,
              sub.email,
              sub.status.replace('_', ' ').toUpperCase(),
              sub.status === 'good' ? `$${price.toFixed(2)}` : '-'
            ];
          }
        });

        const tableHeaders = pdfShowPassword 
          ? [['Exchange', 'Email', 'Password', 'Status', 'Price']]
          : [['Exchange', 'Email', 'Status', 'Price']];

        autoTable(doc, {
          startY: currentY + 4,
          head: tableHeaders,
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 8 },
          didDrawPage: (data) => {
            currentY = data.cursor?.y || currentY;
          },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
        
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
      });

      doc.save(`admin_report_${date.replace(/\//g, '-')}.pdf`);
      
      setPdfStatusFilter("all");
      setPdfUserFilter("all");
      setPdfShowPassword(true);
      
      toast({
        title: "Download Complete",
        description: `PDF report saved with ${filteredData.length} accounts from ${Object.keys(groupedByUser).length} users.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to fetch submissions for export.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    toast({
      title: "Generating Excel...",
      description: "Fetching all submissions for export...",
    });

    try {
      const allSubmissions = await getAllSubmissionsForExport();

      const data = allSubmissions.map((sub: SubmissionWithUser) => {
        const ex = exchanges.find(e => e.name === sub.exchange);
        const price = ex ? parseFloat(ex.priceUsdt || "0") : 0;
        return {
          'User': sub.username || 'Unknown',
          'Exchange': sub.exchange,
          'Email': sub.email,
          'Password': sub.passwordHash,
          'Status': sub.status.replace('_', ' ').toUpperCase(),
          'Price (USDT)': sub.status === 'good' ? price.toFixed(2) : '0.00',
          'Created At': new Date(sub.createdAt).toLocaleDateString()
        };
      });

      const totalPrice = allSubmissions
        .filter((s: SubmissionWithUser) => s.status === 'good')
        .reduce((sum: number, sub: SubmissionWithUser) => {
          const ex = exchanges.find(e => e.name === sub.exchange);
          return sum + parseFloat(ex?.priceUsdt || "0");
        }, 0);

      data.push({
        'User': '',
        'Exchange': '',
        'Email': '',
        'Password': '',
        'Status': 'TOTAL',
        'Price (USDT)': totalPrice.toFixed(2),
        'Created At': ''
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Submissions');
      
      const date = new Date().toLocaleDateString().replace(/\//g, '-');
      XLSX.writeFile(wb, `admin_report_${date}.xlsx`);
      
      toast({
        title: "Download Complete",
        description: `Excel report saved with ${allSubmissions.length} accounts.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to fetch submissions for export.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleApproveUser = (id: number, username: string) => {
    approveUser.mutate(id, {
      onSuccess: () => {
        toast({ title: "User Approved", description: `${username} has been approved` });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to approve user", variant: "destructive" });
      },
    });
  };

  const handleToggleUserEnabled = (id: number, username: string, currentlyEnabled: boolean) => {
    toggleUserEnabled.mutate(id, {
      onSuccess: () => {
        toast({ 
          title: currentlyEnabled ? "User Disabled" : "User Enabled", 
          description: `${username} has been ${currentlyEnabled ? 'disabled' : 'enabled'}` 
        });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update user status", variant: "destructive" });
      },
    });
  };

  const handleResetPassword = () => {
    if (!resetPasswordUserId || !newPassword) return;
    resetPassword.mutate({ id: resetPasswordUserId, newPassword }, {
      onSuccess: () => {
        toast({ title: "Password Reset", description: "Password has been reset successfully" });
        setResetPasswordUserId(null);
        setNewPassword("");
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to reset password", variant: "destructive" });
      },
    });
  };

  const handleDeleteUser = () => {
    if (!deleteUserId) return;
    deleteUser.mutate(deleteUserId, {
      onSuccess: () => {
        toast({ title: "User Deleted", description: `${deleteUserName} has been deleted and banned from the platform` });
        setDeleteUserId(null);
        setDeleteUserName("");
      },
      onError: (error) => {
        toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
      },
    });
  };

  const openDeleteDialog = (id: number, username: string) => {
    setDeleteUserId(id);
    setDeleteUserName(username);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
            <p className="text-muted-foreground text-sm">Manage submissions and system settings</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={portalStatus?.isOpen === true ? "default" : "outline"}
              size="sm" 
              className={cn(
                "transition-all",
                portalStatus?.isOpen === true 
                  ? "bg-green-500 hover:bg-green-600 text-white" 
                  : "border-red-500 text-red-500 hover:bg-red-500/10"
              )}
              onClick={() => {
                if (portalStatus !== undefined) {
                  togglePortalStatus.mutate(!portalStatus.isOpen);
                }
              }}
              disabled={togglePortalStatus.isPending || portalStatus === undefined}
              data-testid="button-toggle-portal"
            >
              <Power className="mr-2 h-4 w-4" />
              {portalStatus === undefined ? "Loading..." : portalStatus.isOpen ? "Portal Open" : "Portal Closed"}
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setShowBulkDeleteConfirm(true)}
              disabled={badCount + goodCount + wrongPasswordCount === 0}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-admin-delete-all-checked"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Checked ({badCount + goodCount + wrongPasswordCount})
            </Button>
             <Button variant="outline" size="sm" onClick={() => setIsPdfDialogOpen(true)} data-testid="button-admin-export-pdf">
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} data-testid="button-admin-export-excel">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
          </div>
        </div>

        {/* Stats Grid - shows counts for current page */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{totalSubmissions}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Pending (Page)</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{goodCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Good (Page)</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">{wrongPasswordCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Wrong (Page)</div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{badCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Bad (Page)</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="submissions">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="submissions">Submissions Queue</TabsTrigger>
            <TabsTrigger value="users" className="relative">
              <Users className="mr-2 h-4 w-4" /> Users
              {pendingApprovalCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingApprovalCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Exchange Settings</TabsTrigger>
          </TabsList>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-4 mt-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by email, username, or exchange..." 
                  className="pl-9 bg-secondary/50" 
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]" data-testid="select-status-filter">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-status-all">All Statuses</SelectItem>
                  <SelectItem value="pending" data-testid="option-status-pending">Pending</SelectItem>
                  <SelectItem value="good" data-testid="option-status-good">Good</SelectItem>
                  <SelectItem value="bad" data-testid="option-status-bad">Bad</SelectItem>
                  <SelectItem value="wrong_password" data-testid="option-status-wrong">Wrong Password</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1" data-testid="button-clear-filters">
                  <X className="h-4 w-4" /> Clear
                </Button>
              )}
            </div>
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {submissions.length} of {totalSubmissions} submissions
                {isFetching && !submissionsLoading && " (updating...)"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || submissionsLoading}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <span>Page {page} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || submissionsLoading}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {submissionsLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Exchange</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((sub) => (
                          <TableRow key={sub.id} data-testid={`row-submission-${sub.id}`}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">{sub.username}</span>
                                <span>{sub.email}</span>
                                <span className="text-xs text-muted-foreground font-mono">{sub.passwordHash}</span>
                              </div>
                            </TableCell>
                            <TableCell>{sub.exchange}</TableCell>
                            <TableCell>
                              <Badge variant={sub.status === 'pending' ? 'outline' : 'default'} 
                                className={cn(
                                  "capitalize",
                                  sub.status === 'good' && "bg-green-500",
                                  sub.status === 'bad' && "bg-red-500",
                                  sub.status === 'wrong_password' && "bg-amber-500",
                                  sub.status === 'pending' && "text-yellow-500 border-yellow-500"
                                )}>
                                {sub.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                onClick={() => updateStatus.mutate({ id: sub.id, status: 'good' })}
                                title="Mark as Good"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                onClick={() => updateStatus.mutate({ id: sub.id, status: 'wrong_password' })}
                                title="Mark as Wrong Password"
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => updateStatus.mutate({ id: sub.id, status: 'bad' })}
                                title="Mark as Bad"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Bottom pagination */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || submissionsLoading}
                data-testid="button-prev-page-bottom"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || submissionsLoading}
                data-testid="button-next-page-bottom"
              >
                Next
              </Button>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> User Management
                </CardTitle>
                <CardDescription>Approve new users, manage access, and reset passwords</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.filter(u => u.role !== 'admin').map((user) => (
                          <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{user.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {!user.isApproved && (
                                  <Badge className="bg-amber-500">Pending Approval</Badge>
                                )}
                                {user.isApproved && user.isEnabled && (
                                  <Badge className="bg-green-500">Active</Badge>
                                )}
                                {!user.isEnabled && (
                                  <Badge className="bg-red-500">Disabled</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              {!user.isApproved && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-green-500 border-green-500 hover:bg-green-500/10"
                                  onClick={() => handleApproveUser(user.id, user.username)}
                                  disabled={approveUser.isPending}
                                  data-testid={`button-approve-${user.id}`}
                                >
                                  <UserCheck className="h-4 w-4 mr-1" /> Approve
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline"
                                className={user.isEnabled ? "text-red-500 border-red-500 hover:bg-red-500/10" : "text-green-500 border-green-500 hover:bg-green-500/10"}
                                onClick={() => handleToggleUserEnabled(user.id, user.username, user.isEnabled)}
                                disabled={toggleUserEnabled.isPending}
                                data-testid={`button-toggle-${user.id}`}
                              >
                                {user.isEnabled ? (
                                  <><UserX className="h-4 w-4 mr-1" /> Disable</>
                                ) : (
                                  <><UserCheck className="h-4 w-4 mr-1" /> Enable</>
                                )}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setResetPasswordUserId(user.id)}
                                data-testid={`button-reset-password-${user.id}`}
                              >
                                <KeyRound className="h-4 w-4 mr-1" /> Reset Password
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-red-500 border-red-500 hover:bg-red-500/10"
                                onClick={() => openDeleteDialog(user.id, user.username)}
                                data-testid={`button-delete-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                   <CardTitle>Exchange Management</CardTitle>
                   <CardDescription>Configure supported exchanges for users</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add New</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Exchange</DialogTitle>
                      <DialogDescription>Add a new exchange platform to the dropdown list.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Exchange Name</Label>
                        <Input id="name" value={newExchangeName} onChange={(e) => setNewExchangeName(e.target.value)} data-testid="input-exchange-name" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="price">Price (USDT)</Label>
                        <Input 
                          id="price" 
                          type="number" 
                          step="0.01"
                          min="0"
                          placeholder="e.g. 5.00"
                          value={newExchangePrice} 
                          onChange={(e) => setNewExchangePrice(e.target.value)} 
                          data-testid="input-exchange-price"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddExchange} disabled={createExchange.isPending}>
                        {createExchange.isPending ? "Adding..." : "Add Exchange"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {exchanges.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20" data-testid={`exchange-row-${ex.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                          {ex.name.substring(0, 1)}
                        </div>
                        <div className="flex flex-col">
                          <span className={cn("font-medium", !ex.isActive && "text-muted-foreground line-through")}>{ex.name}</span>
                          <span className="text-sm text-green-500 font-mono">${parseFloat(ex.priceUsdt || "0").toFixed(2)} USDT</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openEditPriceDialog({ id: ex.id, priceUsdt: ex.priceUsdt })}
                          data-testid={`button-edit-price-${ex.id}`}
                        >
                          Edit Price
                        </Button>
                        <Button 
                          variant={ex.isActive ? "default" : "secondary"} 
                          size="sm" 
                          onClick={() => toggleExchange.mutate(ex.id)}
                          data-testid={`button-toggle-exchange-${ex.id}`}
                        >
                          {ex.isActive ? "Active" : "Inactive"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUserId} onOpenChange={(open) => !open && setResetPasswordUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>Enter a new password for this user.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input 
                id="new-password" 
                type="text"
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password..."
                className="font-mono"
                data-testid="input-new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUserId(null)} data-testid="button-reset-cancel">
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resetPassword.isPending || !newPassword} data-testid="button-reset-confirm">
              {resetPassword.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Exchange Price Dialog */}
      <Dialog open={!!editPriceExchangeId} onOpenChange={(open) => !open && setEditPriceExchangeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exchange Price</DialogTitle>
            <DialogDescription>Update the price in USDT for this exchange.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-price">Price (USDT)</Label>
              <Input 
                id="edit-price" 
                type="number"
                step="0.01"
                min="0"
                value={editPrice} 
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="e.g. 5.00"
                className="font-mono"
                data-testid="input-edit-price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPriceExchangeId(null)} data-testid="button-edit-price-cancel">
              Cancel
            </Button>
            <Button onClick={handleUpdatePrice} disabled={updateExchangePrice.isPending} data-testid="button-edit-price-confirm">
              {updateExchangePrice.isPending ? "Updating..." : "Update Price"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteUserName}</strong>? This will ban them from using the platform and they will not be able to login anymore.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserId(null)} data-testid="button-delete-cancel">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser} 
              disabled={deleteUser.isPending}
              data-testid="button-delete-confirm"
            >
              {deleteUser.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Export Options Dialog */}
      <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export PDF Report</DialogTitle>
            <DialogDescription>Select filters for your PDF export. Accounts will be grouped by username.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Filter by Status</Label>
              <Select value={pdfStatusFilter} onValueChange={setPdfStatusFilter}>
                <SelectTrigger data-testid="select-pdf-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-pdf-status-all">All Statuses</SelectItem>
                  <SelectItem value="good" data-testid="option-pdf-status-good">Good</SelectItem>
                  <SelectItem value="pending" data-testid="option-pdf-status-pending">Pending</SelectItem>
                  <SelectItem value="bad" data-testid="option-pdf-status-bad">Bad</SelectItem>
                  <SelectItem value="wrong_password" data-testid="option-pdf-status-wrong">Wrong Password</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Filter by User</Label>
              <Select value={pdfUserFilter} onValueChange={setPdfUserFilter}>
                <SelectTrigger data-testid="select-pdf-user">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  <SelectItem value="all" data-testid="option-pdf-user-all">All Users</SelectItem>
                  {users.filter(u => u.role !== 'admin').map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()} data-testid={`option-pdf-user-${user.id}`}>
                      {user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="show-password" 
                checked={pdfShowPassword} 
                onCheckedChange={(checked) => setPdfShowPassword(checked === true)}
                data-testid="checkbox-pdf-password"
              />
              <Label htmlFor="show-password" className="cursor-pointer">Include passwords in PDF</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPdfDialogOpen(false)} data-testid="button-pdf-cancel">
              Cancel
            </Button>
            <Button onClick={handleExportPDF} data-testid="button-pdf-export">
              <Download className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <AlertDialogCancel data-testid="button-admin-bulk-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-admin-bulk-delete-confirm"
            >
              {deleteAllChecked.isPending ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
