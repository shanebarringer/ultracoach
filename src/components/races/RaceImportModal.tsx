'use client'

import {
  Button,
  Card,
  CardBody,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
  Tab,
  Tabs,
} from '@heroui/react'
import { parseGPX } from '@we-gold/gpxjs'
import { isAxiosError } from 'axios'
import { useAtom, useSetAtom } from 'jotai'
import { FileIcon, MapIcon, TableIcon, UploadIcon } from 'lucide-react'
import Papa from 'papaparse'

import { useCallback, useState } from 'react'

import { api } from '@/lib/api-client'
import { raceImportErrorsAtom, raceImportProgressAtom } from '@/lib/atoms/races'
import { createLogger } from '@/lib/logger'
import { retryWithBackoff } from '@/lib/rate-limiter'
import { toast } from '@/lib/toast'

const logger = createLogger('RaceImportModal')

interface ParsedRaceData {
  name: string
  date?: string
  location?: string
  distance_miles?: number
  distance_type?: string
  elevation_gain_feet?: number
  terrain_type?: string
  website_url?: string
  notes?: string
  source: 'gpx' | 'csv'
  gpx_data?: {
    tracks: Array<{
      name?: string
      points: Array<{
        lat: number
        lon: number
        ele?: number
        time?: string
      }>
    }>
    waypoints: Array<{
      name?: string
      lat: number
      lon: number
      ele?: number
      desc?: string
    }>
  }
}

interface RaceImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function RaceImportModal({ isOpen, onClose, onSuccess }: RaceImportModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [parsedRaces, setParsedRaces] = useState<ParsedRaceData[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedTab, setSelectedTab] = useState('upload')

  // Use Jotai atoms for import progress tracking
  const setImportProgress = useSetAtom(raceImportProgressAtom)
  const [importErrors, setImportErrors] = useAtom(raceImportErrorsAtom)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const parseGPXFile = useCallback(async (file: File): Promise<ParsedRaceData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const gpxContent = e.target?.result as string

          // Basic XML structure validation
          if (!gpxContent.includes('<gpx') || !gpxContent.includes('</gpx>')) {
            throw new Error('Invalid GPX file: Missing required GPX XML structure')
          }

          // Check for minimum content length (prevent empty or minimal files)
          if (gpxContent.length < 500) {
            throw new Error('Invalid GPX file: File appears to be too small or incomplete')
          }

          const [gpx, error] = parseGPX(gpxContent)

          if (error || !gpx) {
            throw new Error(typeof error === 'string' ? error : 'Failed to parse GPX content')
          }

          // Comprehensive GPX validation
          const track = gpx.tracks?.[0]
          if (!track || !track.points || track.points.length < 10) {
            throw new Error(
              'Invalid GPX file: Must contain at least 10 track points to represent a meaningful route'
            )
          }

          // Validate track points have required coordinates
          const validPoints = track.points.filter(
            p =>
              p.latitude != null &&
              p.longitude != null &&
              !isNaN(p.latitude) &&
              !isNaN(p.longitude) &&
              p.latitude >= -90 &&
              p.latitude <= 90 &&
              p.longitude >= -180 &&
              p.longitude <= 180
          )

          if (validPoints.length < track.points.length * 0.9) {
            throw new Error('Invalid GPX file: Too many track points with invalid coordinates')
          }

          if (validPoints.length < 10) {
            throw new Error('Invalid GPX file: Not enough valid track points (minimum 10 required)')
          }

          // Check for reasonable distance (prevent corrupted GPS data)
          const totalDistanceMeters = track?.distance?.total || 0
          if (totalDistanceMeters < 100) {
            // Less than 100 meters
            throw new Error('Invalid GPX file: Track distance too short (minimum 100 meters)')
          }

          if (totalDistanceMeters > 200000) {
            // More than 200km (unrealistic for most races)
            logger.warn('Very long GPX track detected', {
              distance: totalDistanceMeters,
              fileName: file.name,
            })
          }

          // Extract race data from validated GPX
          const name = gpx.metadata?.name || track?.name || file.name.replace(/\.gpx$/i, '')

          // Calculate total distance in miles
          const totalDistance = totalDistanceMeters ? totalDistanceMeters / 1609.34 : 0 // Convert meters to miles

          // Calculate elevation gain in feet
          const elevationGain = track?.elevation?.positive ? track.elevation.positive * 3.28084 : 0 // Convert meters to feet

          // Determine distance type based on distance
          let distanceType = 'Custom'
          if (totalDistance >= 24 && totalDistance <= 28) distanceType = 'Marathon'
          else if (totalDistance >= 30 && totalDistance <= 32) distanceType = '50K'
          else if (totalDistance >= 48 && totalDistance <= 52) distanceType = '50M'
          else if (totalDistance >= 60 && totalDistance <= 65) distanceType = '100K'
          else if (totalDistance >= 98 && totalDistance <= 102) distanceType = '100M'

          // Determine terrain type based on elevation gain
          let terrainType = 'road'
          if (elevationGain > 5000) terrainType = 'mountain'
          else if (elevationGain > 2000) terrainType = 'trail'
          else if (elevationGain > 500) terrainType = 'mixed'

          // Get start location (approximate)
          const startPoint = track?.points?.[0]
          const location = startPoint
            ? `${startPoint.latitude?.toFixed(4)}, ${startPoint.longitude?.toFixed(4)}`
            : 'Unknown Location'

          resolve({
            name,
            location,
            distance_miles: Math.round(totalDistance * 100) / 100,
            distance_type: distanceType,
            elevation_gain_feet: Math.round(elevationGain),
            terrain_type: terrainType,
            notes: `Imported from GPX file: ${file.name}`,
            source: 'gpx',
            gpx_data: {
              tracks:
                gpx.tracks?.map(t => ({
                  name: t.name || undefined,
                  points:
                    t.points?.map(p => ({
                      lat: p.latitude,
                      lon: p.longitude,
                      ele: p.elevation || undefined,
                      time: p.time instanceof Date ? p.time.toISOString() : p.time || undefined,
                    })) || [],
                })) || [],
              waypoints:
                gpx.waypoints?.map(w => ({
                  name: w.name || undefined,
                  lat: w.latitude,
                  lon: w.longitude,
                  ele: w.elevation || undefined,
                  desc: w.description || undefined,
                })) || [],
            },
          })
        } catch (error) {
          logger.error('Error parsing GPX file:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          })
          reject(
            new Error(
              `Failed to parse GPX file: ${error instanceof Error ? error.message : String(error)}`
            )
          )
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }, [])

  const parseCSVFile = useCallback(async (file: File): Promise<ParsedRaceData[]> => {
    // Helper functions for robust CSV header mapping
    const normalizeKey = (k: string): string => {
      return k.toLowerCase().replace(/[\s_()]/g, '')
    }

    const buildHeaderMap = (headers: string[]) => new Map(headers.map(k => [normalizeKey(k), k]))

    const valueFrom = (
      row: Record<string, string>,
      headerMap: Map<string, string>,
      candidates: string[]
    ): string | undefined => {
      for (const c of candidates) {
        const nk = normalizeKey(c)
        const orig = headerMap.get(nk)
        if (orig) {
          const raw = row[orig]
          if (typeof raw === 'string') {
            const v = raw.trim()
            if (v !== '') return v
          }
        }
      }
      return undefined
    }

    /** Parse month name to 1-based month number */
    const parseMonthName = (name: string): number | undefined => {
      const months: Record<string, number> = {
        jan: 1,
        january: 1,
        feb: 2,
        february: 2,
        mar: 3,
        march: 3,
        apr: 4,
        april: 4,
        may: 5,
        jun: 6,
        june: 6,
        jul: 7,
        july: 7,
        aug: 8,
        august: 8,
        sep: 9,
        sept: 9,
        september: 9,
        oct: 10,
        october: 10,
        nov: 11,
        november: 11,
        dec: 12,
        december: 12,
      }
      return months[name.toLowerCase()]
    }

    /**
     * Normalize various date formats to ISO YYYY-MM-DD format.
     * Required because races API uses strict z.string().date() validation.
     *
     * Supported formats:
     * - YYYY-MM-DD (already ISO, pass through)
     * - MM/DD/YYYY (US format)
     * - DD/MM/YYYY (EU format - detected if day > 12)
     * - Month DD, YYYY (e.g., "Jan 15, 2024")
     * - DD Month YYYY (e.g., "15 Jan 2024")
     */
    const normalizeToISODate = (dateStr: string | undefined): string | undefined => {
      if (!dateStr) return undefined

      const trimmed = dateStr.trim()
      if (trimmed === '') return undefined

      // 1. Already ISO format (YYYY-MM-DD) - pass through
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed
      }

      // 2. Slash format: DD/MM/YYYY or MM/DD/YYYY
      const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (slashMatch) {
        const [, first, second, year] = slashMatch
        const firstNum = parseInt(first, 10)
        const secondNum = parseInt(second, 10)

        let day: number, month: number
        /**
         * Heuristic for ambiguous slash dates (e.g., 01/02/2024):
         * - If first number > 12, it must be day → DD/MM/YYYY (EU format)
         * - Otherwise, assume MM/DD/YYYY (US format)
         *
         * LIMITATION: Ambiguous dates like 01/02/2024 will be parsed as
         * January 2nd (US) rather than February 1st (EU). This is documented
         * behavior - users should use unambiguous formats like "Jan 2, 2024"
         * or "2024-01-02" for critical data.
         */
        if (firstNum > 12) {
          day = firstNum
          month = secondNum
        } else {
          // Assume MM/DD/YYYY (US format) for ambiguous cases
          month = firstNum
          day = secondNum
        }

        // Validate day/month ranges
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          logger.warn('Invalid day/month in slash date', { dateStr, day, month })
          return undefined
        }

        // Validate the date is actually valid (e.g., not Feb 30)
        const testDate = new Date(parseInt(year, 10), month - 1, day)
        if (
          testDate.getFullYear() !== parseInt(year, 10) ||
          testDate.getMonth() !== month - 1 ||
          testDate.getDate() !== day
        ) {
          logger.warn('Invalid calendar date in slash format', { dateStr, day, month, year })
          return undefined
        }

        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }

      // 3. Month-name format: "Month DD, YYYY" or "Month DD YYYY"
      const monthNameFirstMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
      if (monthNameFirstMatch) {
        const [, monthName, day, year] = monthNameFirstMatch
        const month = parseMonthName(monthName)
        if (month !== undefined) {
          return `${year}-${String(month).padStart(2, '0')}-${String(parseInt(day, 10)).padStart(2, '0')}`
        }
      }

      // 4. Reversed month-name format: "DD Month YYYY"
      const dayFirstMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
      if (dayFirstMatch) {
        const [, day, monthName, year] = dayFirstMatch
        const month = parseMonthName(monthName)
        if (month !== undefined) {
          return `${year}-${String(month).padStart(2, '0')}-${String(parseInt(day, 10)).padStart(2, '0')}`
        }
      }

      // 5. Fallback: Only for truly unambiguous month-name inputs that regex didn't catch
      // This catches variations like "January 15th, 2024" with ordinal suffixes
      const parsed = new Date(trimmed)
      if (!isNaN(parsed.getTime())) {
        // Verify it contains a month name to avoid ambiguous numeric dates
        if (/[A-Za-z]/.test(trimmed)) {
          const year = parsed.getFullYear()
          const month = String(parsed.getMonth() + 1).padStart(2, '0')
          const day = String(parsed.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
      }

      // Parsing failed
      logger.warn('Could not parse date from CSV', { dateStr })
      return undefined
    }

    return new Promise((resolve, reject) => {
      logger.debug('Starting CSV parse', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      })

      // Step 1: Use FileReader to read file content as text for better browser compatibility
      const fileReader = new FileReader()

      fileReader.onload = event => {
        try {
          const csvText = event.target?.result as string
          logger.debug('FileReader completed', { textLength: csvText?.length })

          if (!csvText || csvText.trim().length === 0) {
            throw new Error('File is empty or could not be read')
          }

          // Step 2: Parse the text string with Papa.parse
          logger.debug('Starting Papa.parse on text string')
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            error: (error: unknown) => {
              const msg = error instanceof Error ? error.message : String(error)
              logger.error('Papa.parse failed', { error: msg })
              reject(new Error(`CSV parsing engine failed: ${msg}`))
            },
            complete: results => {
              try {
                logger.info('Papa.parse complete', {
                  dataLength: results.data?.length,
                  errorCount: results.errors?.length || 0,
                  metaDelimiter: results.meta?.delimiter,
                  hasData: !!results.data,
                  fieldsFound: results.meta?.fields?.length || 0,
                })

                // Check for Papa.parse errors first
                if (results.errors && results.errors.length > 0) {
                  logger.error('Papa.parse encountered errors', {
                    errors: results.errors.map(err => ({ row: err.row, message: err.message })),
                  })
                  const errorMessages = results.errors
                    .map(err => `Row ${err.row}: ${err.message}`)
                    .join('; ')
                  throw new Error(`CSV parsing failed: ${errorMessages}`)
                }

                // Validate CSV structure
                if (!results.data || results.data.length === 0) {
                  throw new Error('CSV file is empty or contains no valid data rows')
                }

                if (results.data.length > 1000) {
                  throw new Error('CSV file contains too many rows (maximum 1000 races per file)')
                }

                // Check for basic required headers with flexible column mapping
                const headers =
                  results.meta?.fields && results.meta.fields.length > 0
                    ? (results.meta.fields as string[])
                    : Object.keys(results.data[0] as Record<string, string>)
                const headerMap = buildHeaderMap(headers)
                const nameColumns = headers.filter(h =>
                  /^(name|race_?name|event_?name|title)$/i.test(h.toLowerCase())
                )

                if (nameColumns.length === 0) {
                  throw new Error(
                    'CSV file must contain a name column (name, race_name, event_name, or title)'
                  )
                }

                logger.info('CSV parsing', {
                  fileName: file.name,
                  rows: results.data.length,
                  headers: headers,
                  nameColumn: nameColumns[0],
                })

                const races: ParsedRaceData[] = []
                const errors: string[] = []

                ;(results.data as Record<string, string>[]).forEach(
                  (row: Record<string, string>, index: number) => {
                    try {
                      // Robust column mapping using normalized headers
                      const getName = () => {
                        return valueFrom(row, headerMap, [
                          'name',
                          'race_name',
                          'race name',
                          'event_name',
                          'event name',
                          'title',
                          'racename',
                          'eventname',
                        ])
                      }

                      const getDate = () => {
                        return valueFrom(row, headerMap, [
                          'date',
                          'race_date',
                          'race date',
                          'event_date',
                          'event date',
                          'racedate',
                          'eventdate',
                        ])
                      }

                      const getLocation = () => {
                        return valueFrom(row, headerMap, [
                          'location',
                          'place',
                          'city',
                          'venue',
                          'where',
                          'state',
                          'country',
                        ])
                      }

                      const getDistance = () => {
                        const distStr = valueFrom(row, headerMap, [
                          'distance',
                          'distance_miles',
                          'distance miles',
                          'distance(miles)',
                          'miles',
                          'race_distance',
                          'racedistance',
                          'dist',
                        ])
                        if (distStr) {
                          const parsed = parseFloat(distStr)
                          return !isNaN(parsed) && parsed >= 0 ? parsed : 0
                        }
                        return 0
                      }

                      const getElevation = () => {
                        const elevStr = valueFrom(row, headerMap, [
                          'elevation',
                          'elevation_gain',
                          'elevation gain',
                          'elevation gain(ft)',
                          'elevationgain',
                          'elevation_feet',
                          'climb',
                          'vert',
                          'ascent',
                        ])
                        if (elevStr) {
                          const parsed = parseInt(elevStr, 10)
                          return !isNaN(parsed) && parsed >= 0 ? parsed : 0
                        }
                        return 0
                      }

                      const name = getName()
                      if (!name || name.trim().length === 0) {
                        errors.push(`Row ${index + 1}: Missing race name`)
                        return
                      }

                      if (name.length > 200) {
                        errors.push(`Row ${index + 1}: Race name too long (maximum 200 characters)`)
                        return
                      }

                      const race: ParsedRaceData = {
                        name: name.trim(),
                        date: normalizeToISODate(getDate()),
                        location: getLocation(),
                        distance_miles: getDistance(),
                        distance_type:
                          valueFrom(row, headerMap, [
                            'distance_type',
                            'distancetype',
                            'type',
                            'category',
                          ]) || 'Custom',
                        elevation_gain_feet: getElevation(),
                        terrain_type: (
                          valueFrom(row, headerMap, [
                            'terrain_type',
                            'terraintype',
                            'terrain',
                            'surface',
                          ]) || 'mixed'
                        ).toLowerCase(),
                        website_url: valueFrom(row, headerMap, [
                          'website_url',
                          'websiteurl',
                          'website',
                          'url',
                          'link',
                        ]),
                        notes:
                          valueFrom(row, headerMap, [
                            'notes',
                            'description',
                            'comments',
                            'details',
                          ]) || `Imported from CSV file: ${file.name}, Row ${index + 1}`,
                        source: 'csv',
                      }

                      // Validate terrain type
                      const validTerrains = [
                        'trail',
                        'mountain',
                        'road',
                        'mixed',
                        'desert',
                        'forest',
                      ]
                      if (!race.terrain_type || !validTerrains.includes(race.terrain_type)) {
                        race.terrain_type = 'mixed'
                      }

                      races.push(race)
                    } catch (rowError) {
                      errors.push(
                        `Row ${index + 1}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`
                      )
                    }
                  }
                )

                if (races.length === 0) {
                  throw new Error(
                    `No valid races found in CSV file${errors.length > 0 ? '. Errors: ' + errors.slice(0, 3).join('; ') : ''}`
                  )
                }

                if (errors.length > 0) {
                  logger.warn('CSV parsing encountered errors', {
                    fileName: file.name,
                    totalRows: results.data.length,
                    successfulRaces: races.length,
                    errors: errors.slice(0, 5), // Log first 5 errors
                  })
                }

                resolve(races)
              } catch (error) {
                logger.error('Error parsing CSV file', {
                  fileName: file.name,
                  error: error instanceof Error ? error.message : String(error),
                })
                reject(
                  new Error(
                    `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
                  )
                )
              }
            },
          })
        } catch (fileReaderError) {
          logger.error('FileReader parsing failed', {
            error:
              fileReaderError instanceof Error ? fileReaderError.message : String(fileReaderError),
          })
          reject(
            new Error(
              `Failed to parse CSV content: ${fileReaderError instanceof Error ? fileReaderError.message : 'Unknown error'}`
            )
          )
        }
      }

      // FileReader error handler
      fileReader.onerror = _event => {
        logger.error('FileReader failed', { event: 'FileReader error event' })
        reject(new Error(`Failed to read file: ${file.name}`))
      }

      // FileReader abort handler
      fileReader.onabort = () => {
        logger.warn('FileReader aborted')
        reject(new Error(`File reading was aborted: ${file.name}`))
      }

      // Step 3: Start reading the file as text
      logger.debug('Starting FileReader.readAsText()')
      fileReader.readAsText(file)
    })
  }, [])

  const handleFiles = useCallback(
    async (files: File[]) => {
      const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

      // First filter for valid file extensions
      const validFiles = files.filter(
        file => file.name.toLowerCase().endsWith('.gpx') || file.name.toLowerCase().endsWith('.csv')
      )

      if (validFiles.length === 0) {
        toast.error('Invalid files', 'Please select valid GPX or CSV files')
        return
      }

      // Check file sizes to prevent memory exhaustion
      const oversizedFiles = validFiles.filter(file => file.size > MAX_FILE_SIZE)
      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map(f => f.name).join(', ')
        toast.error(
          'Files too large',
          `The following files exceed the 10MB limit: ${fileNames}. Please use smaller files to prevent memory issues.`
        )
        return
      }

      // Check total size of all files combined
      const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0)
      if (totalSize > MAX_FILE_SIZE * 3) {
        // Allow up to 30MB total for multiple files
        toast.error(
          'Total size too large',
          `Combined file size (${(totalSize / 1024 / 1024).toFixed(1)}MB) exceeds the 30MB limit. Please select fewer or smaller files.`
        )
        return
      }

      try {
        logger.info('Starting file processing', { fileCount: validFiles.length })
        setImportErrors([]) // Clear any previous errors
        setImportProgress({
          current: 0,
          total: validFiles.length,
          message: 'Preparing files...',
        })

        const allRaces: ParsedRaceData[] = []

        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i]
          logger.debug('Processing file', { fileName: file.name, fileSize: file.size })
          setImportProgress({
            current: i + 1,
            total: validFiles.length,
            message: `Processing ${file.name}...`,
          })

          if (file.name.toLowerCase().endsWith('.gpx')) {
            const race = await parseGPXFile(file)
            logger.info('GPX parsed successfully', { raceName: race.name })
            allRaces.push(race)
          } else if (file.name.toLowerCase().endsWith('.csv')) {
            setImportProgress({
              current: i + 1,
              total: validFiles.length,
              message: `Parsing CSV data from ${file.name}...`,
            })
            const races = await parseCSVFile(file)
            logger.info('CSV parsed successfully', {
              raceCount: races.length,
              raceNames: races.map(r => r.name),
            })
            allRaces.push(...races)
          }
        }

        logger.info('Total races parsed', {
          totalCount: allRaces.length,
          raceNames: allRaces.map(r => r.name),
        })
        setImportProgress({
          current: validFiles.length,
          total: validFiles.length,
          message: 'Finalizing import...',
        })
        setParsedRaces(allRaces)
        setImportProgress({ current: 0, total: 0, message: '' }) // Clear processing status
        setSelectedTab('preview')

        toast.success(
          'Files parsed successfully',
          `Imported ${allRaces.length} race${allRaces.length > 1 ? 's' : ''} from ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}`
        )
      } catch (error) {
        logger.error('Error during file processing', {
          error: error instanceof Error ? error.message : String(error),
        })
        setImportProgress({ current: 0, total: 0, message: '' }) // Clear processing status on error
        setImportErrors([String(error)]) // Store error in atom
        toast.error(
          'Parse failed',
          `Failed to parse files: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    },
    [parseGPXFile, parseCSVFile, setImportProgress, setImportErrors]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      await handleFiles(files)
    },
    [handleFiles]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      await handleFiles(files)
    },
    [handleFiles]
  )

  const handleImport = useCallback(async () => {
    if (parsedRaces.length === 0) return

    interface BulkImportResponse {
      summary: {
        successful: number
        duplicates: number
        errors: number
      }
    }

    interface ErrorResponse {
      error?: string
      retryAfter?: number
      details?: string
      existingRaces?: Array<{
        id: string
        name: string
        location: string
        distance: string
        date: string | null
      }>
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Use bulk import API for better performance
      if (parsedRaces.length > 1) {
        const response = await retryWithBackoff(
          async () => {
            return await api.post<BulkImportResponse>(
              '/api/races/bulk-import',
              { races: parsedRaces },
              { timeout: 20000, suppressGlobalToast: true }
            )
          },
          2, // max 2 retries for bulk import
          2000, // 2 second base delay
          error => {
            // Only retry on network errors, not rate limits or validation errors
            if (isAxiosError(error)) {
              return !error.response // Network error (no response)
            }
            return false
          }
        )

        setUploadProgress(100)

        logger.info('Bulk import completed', response.data.summary)

        // Show detailed results
        const { summary } = response.data
        if (summary.successful > 0) {
          toast.success(
            'Bulk import completed',
            `${summary.successful} races imported successfully${summary.duplicates > 0 ? `, ${summary.duplicates} duplicates skipped` : ''}${summary.errors > 0 ? `, ${summary.errors} errors` : ''}`
          )
        }

        if (summary.duplicates > 0) {
          toast.warning(
            'Duplicates detected',
            `${summary.duplicates} race${summary.duplicates > 1 ? 's were' : ' was'} skipped as potential duplicates`
          )
        }

        if (summary.errors > 0 && summary.successful === 0) {
          toast.error(
            'Import failed',
            `${summary.errors} race${summary.errors > 1 ? 's' : ''} failed to import`
          )
        }
      } else {
        // Single race import using original API
        const race = parsedRaces[0]
        await retryWithBackoff(
          async () => {
            return await api.post('/api/races/import', race, {
              timeout: 15000,
              suppressGlobalToast: true,
            })
          },
          3, // max 3 retries for single import
          1000, // 1 second base delay
          error => {
            // Only retry on network errors, not rate limits or validation errors
            if (isAxiosError(error)) {
              return !error.response // Network error (no response)
            }
            return false
          }
        )

        toast.success('Import successful', `Successfully imported "${race.name}"`)
        setUploadProgress(100)
      }

      setParsedRaces([])
      setSelectedTab('upload')
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Error importing races:', error)

      // Provide more helpful error messages based on error type
      let errorMessage = 'Import failed'

      if (isAxiosError(error) && error.response) {
        const status = error.response.status
        const errorData = error.response.data as ErrorResponse

        if (status === 429) {
          const retryAfter = Math.ceil((errorData.retryAfter || 300) / 60)
          errorMessage = `Rate limit exceeded. Too many imports. Please try again in ${retryAfter} minute${retryAfter > 1 ? 's' : ''}.`
        } else if (status === 409) {
          // Duplicate race - show warning instead of error
          const race = parsedRaces[0]
          logger.warn('Duplicate race detected during import', {
            raceName: race?.name,
            existingRaces: errorData.existingRaces,
          })
          toast.warning(
            'Duplicate race detected',
            `${race?.name}: ${errorData.details || 'A similar race may already exist'}`
          )
          // Still close modal on duplicate
          setParsedRaces([])
          setSelectedTab('upload')
          onClose()
          return
        } else {
          errorMessage = errorData.error || 'Failed to import race'
        }
      } else if (isAxiosError(error) && !error.response) {
        errorMessage =
          'Import failed due to network error. Please check your connection and try again.'
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      toast.error('Import failed', errorMessage)
      // Clear modal state to prevent stale preview data on reopen
      setParsedRaces([])
      setSelectedTab('upload')
      onClose()
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [parsedRaces, onSuccess, onClose])

  const resetUpload = useCallback(() => {
    setParsedRaces([])
    setSelectedTab('upload')
    setUploadProgress(0)
    setImportErrors([]) // Clear errors when resetting
  }, [setImportErrors])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <UploadIcon className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Import Races</h3>
            <p className="text-sm text-foreground-600 font-normal">
              Upload GPX files or CSV data to import race information
            </p>
          </div>
        </ModalHeader>
        <ModalBody>
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={key => setSelectedTab(key as string)}
            className="w-full"
          >
            <Tab
              key="upload"
              title={
                <div className="flex items-center gap-2">
                  <UploadIcon className="w-4 h-4" />
                  Upload Files
                </div>
              }
              data-testid="upload-tab"
            >
              <div className="space-y-4">
                {/* Error Display */}
                {importErrors.length > 0 && (
                  <Card className="border-danger bg-danger/5">
                    <CardBody className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="flex-shrink-0 w-5 h-5 rounded-full bg-danger flex items-center justify-center"
                          role="img"
                          aria-label="Import error"
                        >
                          <span className="text-white text-xs font-bold" aria-hidden="true">
                            !
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-danger font-semibold mb-2">Import Error</h4>
                          {importErrors.map((error, index) => (
                            <p key={index} className="text-danger-600 text-sm">
                              {error}
                            </p>
                          ))}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Drag and Drop Zone */}
                <Card
                  className={`border-2 border-dashed transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-foreground-300 hover:border-primary/50'
                  }`}
                >
                  <CardBody
                    className="py-12 text-center cursor-pointer"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-primary/10 rounded-full p-4">
                        <FileIcon className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Drag and drop files here</h3>
                        <p className="text-foreground-600 mb-4">or click to browse your computer</p>
                        <div className="flex gap-2 justify-center">
                          <Chip
                            size="sm"
                            color="primary"
                            variant="flat"
                            startContent={<MapIcon className="w-3 h-3" />}
                          >
                            .GPX Files
                          </Chip>
                          <Chip
                            size="sm"
                            color="secondary"
                            variant="flat"
                            startContent={<TableIcon className="w-3 h-3" />}
                          >
                            .CSV Files
                          </Chip>
                        </div>
                      </div>
                    </div>
                    <input
                      id="file-input"
                      type="file"
                      multiple
                      accept=".gpx,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </CardBody>
                </Card>

                {/* File Format Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardBody className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <MapIcon className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold">GPX Files</h4>
                      </div>
                      <p className="text-sm text-foreground-600 mb-2">
                        GPS track files that automatically extract:
                      </p>
                      <ul className="text-xs text-foreground-500 space-y-1">
                        <li>• Distance calculation</li>
                        <li>• Elevation gain</li>
                        <li>• Route coordinates</li>
                        <li>• Terrain classification</li>
                      </ul>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardBody className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <TableIcon className="w-5 h-5 text-secondary" />
                        <h4 className="font-semibold">CSV Files</h4>
                      </div>
                      <p className="text-sm text-foreground-600 mb-2">Bulk import with columns:</p>
                      <ul className="text-xs text-foreground-500 space-y-1">
                        <li>• name, date, location</li>
                        <li>• distance_miles, distance_type</li>
                        <li>• elevation_gain_feet</li>
                        <li>• terrain_type, website_url</li>
                      </ul>
                    </CardBody>
                  </Card>
                </div>
              </div>
            </Tab>

            <Tab
              key="preview"
              title={
                <div className="flex items-center gap-2">
                  <FileIcon className="w-4 h-4" />
                  Preview ({parsedRaces.length})
                </div>
              }
              data-testid="preview-tab"
            >
              <div className="space-y-4" data-testid="preview-content">
                {parsedRaces.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground-600" data-testid="parsed-races-count">
                        {parsedRaces.length} race{parsedRaces.length > 1 ? 's' : ''} ready for
                        import
                      </p>
                      <Button size="sm" variant="flat" onPress={resetUpload}>
                        Upload Different Files
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto" data-testid="race-list">
                      {parsedRaces.map((race, index) => (
                        <Card
                          key={index}
                          className="border-l-4 border-l-primary/60"
                          data-testid={`race-card-${index}`}
                        >
                          <CardBody className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold" data-testid={`race-name-${index}`}>
                                {race.name}
                              </h4>
                              <Chip
                                size="sm"
                                color={race.source === 'gpx' ? 'primary' : 'secondary'}
                                variant="flat"
                              >
                                {race.source.toUpperCase()}
                              </Chip>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-foreground-600">
                              <div>
                                Distance: {race.distance_miles} miles ({race.distance_type})
                              </div>
                              <div>Elevation: {race.elevation_gain_feet} ft</div>
                              <div>Location: {race.location}</div>
                              <div>Terrain: {race.terrain_type}</div>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>

                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Importing races...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <Progress
                          value={uploadProgress}
                          color="primary"
                          data-testid="import-progress"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-foreground-500">No races parsed yet. Upload files first.</p>
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onPress={onClose}
            disabled={isUploading}
            data-testid="cancel-import"
          >
            Cancel
          </Button>
          {selectedTab === 'preview' && parsedRaces.length > 0 && (
            <Button
              color="primary"
              onPress={handleImport}
              disabled={isUploading}
              isLoading={isUploading}
              data-testid="import-races-button"
            >
              {isUploading
                ? 'Importing...'
                : `Import ${parsedRaces.length} Race${parsedRaces.length > 1 ? 's' : ''}`}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
