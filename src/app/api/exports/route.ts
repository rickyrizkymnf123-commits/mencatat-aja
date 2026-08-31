import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

// Ensure standard Response type is used
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, filters, format } = body; // format: 'pdf' | 'xlsx'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. Fetch user profile to check plan limits
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('plan, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Enforcement: Starter plan cannot export PDF/Excel
    if (profile.plan === 'Starter') {
      return NextResponse.json({ error: 'Export features are only available in the Pro plan.' }, { status: 403 });
    }

    // 2. Fetch Filtered Transactions
    let query = supabaseAdmin
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        description,
        transaction_date,
        source,
        wallets (name),
        categories (name, emoji)
      `)
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.walletId) {
        query = query.eq('wallet_id', filters.walletId);
      }
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }
      if (filters.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }
    }

    const { data: transactions, error: txError } = await query;
    if (txError || !transactions) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Format dates and numbers for WIB (Asia/Jakarta)
    const formattedData = transactions.map((t: any) => {
      const date = new Date(t.transaction_date);
      const wibDate = date.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      return {
        Tanggal: wibDate,
        Jenis: t.type === 'expense' ? 'Pengeluaran' : t.type === 'income' ? 'Pemasukan' : 'Transfer',
        Nominal: Number(t.amount),
        Dompet: t.wallets?.name || '-',
        Kategori: t.categories ? `${t.categories.emoji} ${t.categories.name}` : '-',
        Catatan: t.description || '-',
        Sumber: t.source || 'web',
      };
    });

    const timestamp = Date.now();
    const filename = `Laporan_Keuangan_${timestamp}.${format}`;
    const storagePath = `exports/${userId}/${filename}`;
    let fileBuffer: Buffer;

    // 3. Generate File
    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Transaksi');
      
      // Auto-fit columns
      const maxLens = formattedData.reduce((acc: any, row: any) => {
        Object.keys(row).forEach((key, i) => {
          const cellLen = String(row[key] || '').length;
          acc[i] = Math.max(acc[i] || 10, cellLen);
        });
        return acc;
      }, []);
      worksheet['!cols'] = maxLens.map((len: number) => ({ wch: len + 3 }));

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      fileBuffer = Buffer.from(excelBuffer);
    } else {
      // PDF format using jsPDF
      const doc = new jsPDF();
      doc.setFont('helvetica');

      // Title
      doc.setFontSize(20);
      doc.setTextColor(255, 138, 0); // Orange Brand Accent
      doc.text('Mencatat Aja - Laporan Keuangan', 14, 20);

      // Metadata
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`User: ${profile.full_name || 'Nasabah'}`, 14, 28);
      doc.text(`Tanggal Cetak (WIB): ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`, 14, 34);

      // Summary
      const totalExpense = formattedData
        .filter(r => r.Jenis === 'Pengeluaran')
        .reduce((sum, r) => sum + r.Nominal, 0);
      const totalIncome = formattedData
        .filter(r => r.Jenis === 'Pemasukan')
        .reduce((sum, r) => sum + r.Nominal, 0);
      const netCashflow = totalIncome - totalExpense;

      doc.setFontSize(11);
      doc.setTextColor(50);
      doc.setFillColor(245, 245, 245);
      doc.rect(14, 40, 182, 24, 'F');
      
      doc.text(`Total Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}`, 18, 48);
      doc.text(`Total Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}`, 18, 54);
      doc.setFont('helvetica', 'bold');
      doc.text(`Net Cashflow: Rp ${netCashflow.toLocaleString('id-ID')}`, 18, 60);
      doc.setFont('helvetica', 'normal');

      // Transactions Table
      doc.setFontSize(10);
      let y = 75;
      
      // Header
      doc.setFillColor(255, 138, 0);
      doc.setTextColor(255, 255, 255);
      doc.rect(14, y, 182, 8, 'F');
      doc.text('Tanggal', 16, y + 6);
      doc.text('Tipe', 55, y + 6);
      doc.text('Kategori', 80, y + 6);
      doc.text('Dompet', 115, y + 6);
      doc.text('Nominal', 145, y + 6);
      doc.text('Keterangan', 170, y + 6);

      y += 8;
      doc.setTextColor(50);

      // Rows
      formattedData.forEach((row, i) => {
        // Page break if y exceeds margin
        if (y > 275) {
          doc.addPage();
          y = 20;
          // Re-draw header on new page
          doc.setFillColor(255, 138, 0);
          doc.setTextColor(255, 255, 255);
          doc.rect(14, y, 182, 8, 'F');
          doc.text('Tanggal', 16, y + 6);
          doc.text('Tipe', 55, y + 6);
          doc.text('Kategori', 80, y + 6);
          doc.text('Dompet', 115, y + 6);
          doc.text('Nominal', 145, y + 6);
          doc.text('Keterangan', 170, y + 6);
          y += 8;
          doc.setTextColor(50);
        }

        // Alternating background
        if (i % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(14, y, 182, 7, 'F');
        }

        doc.text(row.Tanggal.split(',')[0], 16, y + 5); // Just date, ignore time for space
        doc.text(row.Jenis, 55, y + 5);
        
        // Remove emoji for PDF compatibility if custom font doesn't render it nicely
        const cleanCategory = row.Kategori.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
        doc.text(cleanCategory, 80, y + 5);
        
        doc.text(row.Dompet, 115, y + 5);
        doc.text(`Rp ${row.Nominal.toLocaleString('id-ID')}`, 145, y + 5);
        doc.text(row.Catatan.substring(0, 15), 170, y + 5); // truncate description

        y += 7;
      });

      const pdfArrayBuffer = doc.output('arraybuffer');
      fileBuffer = Buffer.from(pdfArrayBuffer);
    }

    // 4. Ensure storage bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.some(b => b.name === 'exports')) {
      await supabaseAdmin.storage.createBucket('exports', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      });
    }

    // 5. Upload File to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('exports')
      .upload(storagePath, fileBuffer, {
        contentType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload export file to storage' }, { status: 500 });
    }

    // 6. Generate Signed URL (valid for 15 minutes = 900 seconds)
    const { data: signedUrlData, error: signError } = await supabaseAdmin.storage
      .from('exports')
      .createSignedUrl(storagePath, 900);

    if (signError || !signedUrlData) {
      return NextResponse.json({ error: 'Failed to generate signed download link' }, { status: 500 });
    }

    // 7. Save Export Record in DB
    const { data: exportRecord, error: dbError } = await supabaseAdmin
      .from('exports')
      .insert({
        user_id: userId,
        filename,
        file_path: storagePath,
        status: 'completed',
        expires_at: new Date(Date.now() + 900 * 1000).toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save export record to database' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: signedUrlData.signedUrl,
      record: exportRecord,
    });
  } catch (err: any) {
    console.error('Export route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
