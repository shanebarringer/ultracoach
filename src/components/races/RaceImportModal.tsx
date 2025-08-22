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
import { FileIcon, MapIcon, TableIcon, UploadIcon } from 'lucide-react'
import Papa from 'papaparse'

import { useCallback, useState } from 'react'

import { createLogger } from '@/lib/logger'
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
          const [gpx, error] = parseGPX(gpxContent)

          if (error || !gpx) {
            throw new Error(typeof error === 'string' ? error : 'Failed to parse GPX content')
          }

          // Extract race data from GPX
          const track = gpx.tracks?.[0] // Use first track
          const name = track?.name || gpx.metadata?.name || file.name.replace('.gpx', '')

          // Calculate total distance in miles
          const totalDistance = track?.distance?.total ? track.distance.total / 1609.34 : 0 // Convert meters to miles

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
                      time: p.time?.toISOString() || undefined,
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
          logger.error('Error parsing GPX file:', error)
          reject(new Error(`Failed to parse GPX file: ${error}`))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }, [])

  const parseCSVFile = useCallback(async (file: File): Promise<ParsedRaceData[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: results => {
          try {
            const races: ParsedRaceData[] = (results.data as Record<string, string>[]).map(
              (row, index: number) => ({
                name: row.name || row.race_name || `Race ${index + 1}`,
                date: row.date || row.race_date,
                location: row.location,
                distance_miles: parseFloat(row.distance_miles || row.distance) || 0,
                distance_type: row.distance_type || 'Custom',
                elevation_gain_feet: parseInt(row.elevation_gain_feet || row.elevation) || 0,
                terrain_type: row.terrain_type || row.terrain || 'mixed',
                website_url: row.website_url || row.website,
                notes: row.notes || `Imported from CSV file: ${file.name}`,
                source: 'csv',
              })
            )
            resolve(races)
          } catch (error) {
            logger.error('Error parsing CSV file:', error)
            reject(new Error(`Failed to parse CSV file: ${error}`))
          }
        },
        error: error => {
          logger.error('Papa Parse error:', error)
          reject(new Error(`CSV parsing error: ${error.message}`))
        },
      })
    })
  }, [])

  const handleFiles = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter(
        file => file.name.toLowerCase().endsWith('.gpx') || file.name.toLowerCase().endsWith('.csv')
      )

      if (validFiles.length === 0) {
        toast.error('Invalid files', 'Please select valid GPX or CSV files')
        return
      }

      try {
        const allRaces: ParsedRaceData[] = []

        for (const file of validFiles) {
          if (file.name.toLowerCase().endsWith('.gpx')) {
            const race = await parseGPXFile(file)
            allRaces.push(race)
          } else if (file.name.toLowerCase().endsWith('.csv')) {
            const races = await parseCSVFile(file)
            allRaces.push(...races)
          }
        }

        setParsedRaces(allRaces)
        setSelectedTab('preview')

        toast.success(
          'Files parsed successfully',
          `Imported ${allRaces.length} race${allRaces.length > 1 ? 's' : ''} from ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}`
        )
      } catch (error) {
        logger.error('Error parsing files:', error)
        toast.error('Parse failed', `Failed to parse files: ${error}`)
      }
    },
    [parseGPXFile, parseCSVFile]
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

    setIsUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < parsedRaces.length; i++) {
        const race = parsedRaces[i]

        const response = await fetch('/api/races/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(race),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to import race')
        }

        setUploadProgress(((i + 1) / parsedRaces.length) * 100)
      }

      logger.info(`Successfully imported ${parsedRaces.length} races`)
      toast.success(
        'Import successful',
        `Successfully imported ${parsedRaces.length} race${parsedRaces.length > 1 ? 's' : ''}`
      )

      setParsedRaces([])
      setSelectedTab('upload')
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Error importing races:', error)
      toast.error('Import failed', `Import failed: ${error}`)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [parsedRaces, onSuccess, onClose])

  const resetUpload = useCallback(() => {
    setParsedRaces([])
    setSelectedTab('upload')
    setUploadProgress(0)
  }, [])

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
            >
              <div className="space-y-4">
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
            >
              <div className="space-y-4">
                {parsedRaces.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground-600">
                        {parsedRaces.length} race{parsedRaces.length > 1 ? 's' : ''} ready for
                        import
                      </p>
                      <Button size="sm" variant="flat" onPress={resetUpload}>
                        Upload Different Files
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {parsedRaces.map((race, index) => (
                        <Card key={index} className="border-l-4 border-l-primary/60">
                          <CardBody className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold">{race.name}</h4>
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
                        <Progress value={uploadProgress} color="primary" />
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
          <Button variant="light" onPress={onClose} disabled={isUploading}>
            Cancel
          </Button>
          {selectedTab === 'preview' && parsedRaces.length > 0 && (
            <Button
              color="primary"
              onPress={handleImport}
              disabled={isUploading}
              isLoading={isUploading}
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
